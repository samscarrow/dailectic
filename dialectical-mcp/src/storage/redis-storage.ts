import { createClient, RedisClientType } from 'redis';
import { DebateSession } from '../sessions/manager.js';
import { SessionStorage, SerializedDebateSession, serializeSession, deserializeSession } from './types.js';

export class RedisStorage implements SessionStorage {
  private client: RedisClientType;
  private connected = false;
  private keyPrefix: string;

  constructor(options?: {
    url?: string;
    keyPrefix?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  }) {
    this.keyPrefix = options?.keyPrefix || 'dialectical:';
    
    if (options?.url) {
      this.client = createClient({ url: options.url });
    } else {
      this.client = createClient({
        socket: {
          host: options?.host || 'localhost',
          port: options?.port || 6379,
        },
        password: options?.password,
        database: options?.db || 0,
      });
    }

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    this.client.on('disconnect', () => {
      console.log('Redis Client Disconnected');
      this.connected = false;
    });
  }

  private getSessionKey(id: string): string {
    return `${this.keyPrefix}session:${id}`;
  }

  private getCritiqueKey(sessionId: string, persona: string): string {
    return `${this.keyPrefix}critique:${sessionId}:${persona}`;
  }

  private getSessionListKey(): string {
    return `${this.keyPrefix}sessions`;
  }

  private getSessionsByStatusKey(status: string): string {
    return `${this.keyPrefix}sessions:${status}`;
  }

  async initialize(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async saveSession(session: DebateSession): Promise<void> {
    await this.initialize();

    const serialized = serializeSession(session);
    const sessionKey = this.getSessionKey(session.id);
    
    // Use a transaction to ensure atomicity
    const multi = this.client.multi();
    
    // Store the main session data
    multi.hSet(sessionKey, {
      id: serialized.id,
      startedAt: serialized.startedAt,
      topic: serialized.topic,
      context: serialized.context || '',
      synthesis: serialized.synthesis || '',
      totalTokens: serialized.metadata.totalTokens?.toString() || '0',
      participatingPersonas: JSON.stringify(serialized.metadata.participatingPersonas),
      status: serialized.metadata.status
    });

    // Set expiration (30 days)
    multi.expire(sessionKey, 30 * 24 * 60 * 60);

    // Add to session list and status-specific list
    multi.sAdd(this.getSessionListKey(), session.id);
    multi.sAdd(this.getSessionsByStatusKey(session.metadata.status), session.id);

    // Store critiques separately for efficient access
    for (const [persona, critique] of session.critiques) {
      const critiqueKey = this.getCritiqueKey(session.id, persona);
      multi.set(critiqueKey, critique);
      multi.expire(critiqueKey, 30 * 24 * 60 * 60);
    }

    await multi.exec();
  }

  async getSession(id: string): Promise<DebateSession | null> {
    await this.initialize();

    const sessionKey = this.getSessionKey(id);
    const sessionData = await this.client.hGetAll(sessionKey);

    if (!sessionData || Object.keys(sessionData).length === 0) {
      return null;
    }

    // Get all critiques for this session
    const pattern = this.getCritiqueKey(id, '*');
    const critiqueKeys = await this.client.keys(pattern);
    
    const critiques: Record<string, string> = {};
    if (critiqueKeys.length > 0) {
      const critiqueValues = await this.client.mGet(critiqueKeys);
      critiqueKeys.forEach((key, index) => {
        const persona = key.split(':').pop()!;
        const critique = critiqueValues[index];
        if (critique) {
          critiques[persona] = critique;
        }
      });
    }

    const serialized: SerializedDebateSession = {
      id: sessionData.id,
      startedAt: sessionData.startedAt,
      topic: sessionData.topic,
      context: sessionData.context || undefined,
      synthesis: sessionData.synthesis || undefined,
      critiques,
      metadata: {
        totalTokens: sessionData.totalTokens ? parseInt(sessionData.totalTokens) : undefined,
        participatingPersonas: JSON.parse(sessionData.participatingPersonas || '[]'),
        status: sessionData.status as 'active' | 'synthesizing' | 'completed'
      }
    };

    return deserializeSession(serialized);
  }

  async updateSession(session: DebateSession): Promise<void> {
    // Redis implementation uses saveSession for updates (upsert behavior)
    await this.saveSession(session);
  }

  async deleteSession(id: string): Promise<void> {
    await this.initialize();

    const multi = this.client.multi();
    
    // Remove from all sets
    multi.sRem(this.getSessionListKey(), id);
    multi.sRem(this.getSessionsByStatusKey('active'), id);
    multi.sRem(this.getSessionsByStatusKey('synthesizing'), id);
    multi.sRem(this.getSessionsByStatusKey('completed'), id);

    // Delete session data
    multi.del(this.getSessionKey(id));

    // Delete all critiques
    const pattern = this.getCritiqueKey(id, '*');
    const critiqueKeys = await this.client.keys(pattern);
    if (critiqueKeys.length > 0) {
      multi.del(...critiqueKeys);
    }

    await multi.exec();
  }

  async listSessions(filter?: {
    status?: 'active' | 'synthesizing' | 'completed';
    limit?: number;
    offset?: number;
    since?: Date;
  }): Promise<DebateSession[]> {
    await this.initialize();

    let sessionIds: string[];

    if (filter?.status) {
      sessionIds = await this.client.sMembers(this.getSessionsByStatusKey(filter.status));
    } else {
      sessionIds = await this.client.sMembers(this.getSessionListKey());
    }

    if (sessionIds.length === 0) {
      return [];
    }

    // Get all session data
    const sessionKeys = sessionIds.map(id => this.getSessionKey(id));
    const pipeline = this.client.multi();
    sessionKeys.forEach(key => pipeline.hGetAll(key));
    
    const results = await pipeline.exec();
    const sessions: DebateSession[] = [];

    for (let i = 0; i < results.length; i++) {
      const sessionData = results[i] as Record<string, string>;
      if (!sessionData || Object.keys(sessionData).length === 0) continue;

      const sessionDate = new Date(sessionData.startedAt);
      
      // Apply date filter
      if (filter?.since && sessionDate < filter.since) {
        continue;
      }

      // Get critiques for this session
      const sessionId = sessionData.id;
      const pattern = this.getCritiqueKey(sessionId, '*');
      const critiqueKeys = await this.client.keys(pattern);
      
      const critiques: Record<string, string> = {};
      if (critiqueKeys.length > 0) {
        const critiqueValues = await this.client.mGet(critiqueKeys);
        critiqueKeys.forEach((key, index) => {
          const persona = key.split(':').pop()!;
          const critique = critiqueValues[index];
          if (critique) {
            critiques[persona] = critique;
          }
        });
      }

      const serialized: SerializedDebateSession = {
        id: sessionData.id,
        startedAt: sessionData.startedAt,
        topic: sessionData.topic,
        context: sessionData.context || undefined,
        synthesis: sessionData.synthesis || undefined,
        critiques,
        metadata: {
          totalTokens: sessionData.totalTokens ? parseInt(sessionData.totalTokens) : undefined,
          participatingPersonas: JSON.parse(sessionData.participatingPersonas || '[]'),
          status: sessionData.status as 'active' | 'synthesizing' | 'completed'
        }
      };

      sessions.push(deserializeSession(serialized));
    }

    // Sort by date (newest first)
    sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    // Apply pagination
    const offset = filter?.offset || 0;
    const limit = filter?.limit || sessions.length;
    
    return sessions.slice(offset, offset + limit);
  }

  async addCritique(sessionId: string, persona: string, critique: string): Promise<void> {
    await this.initialize();

    const sessionKey = this.getSessionKey(sessionId);
    const critiqueKey = this.getCritiqueKey(sessionId, persona);

    // Check if session exists
    const exists = await this.client.exists(sessionKey);
    if (!exists) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const multi = this.client.multi();

    // Store the critique
    multi.set(critiqueKey, critique);
    multi.expire(critiqueKey, 30 * 24 * 60 * 60);

    // Update participating personas
    const participatingPersonas = await this.client.hGet(sessionKey, 'participatingPersonas');
    const personas: string[] = participatingPersonas ? JSON.parse(participatingPersonas) : [];
    
    if (!personas.includes(persona)) {
      personas.push(persona);
      multi.hSet(sessionKey, 'participatingPersonas', JSON.stringify(personas));
    }

    await multi.exec();
  }

  async addSynthesis(sessionId: string, synthesis: string): Promise<void> {
    await this.initialize();

    const sessionKey = this.getSessionKey(sessionId);
    
    // Check if session exists
    const exists = await this.client.exists(sessionKey);
    if (!exists) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const multi = this.client.multi();
    
    // Update session with synthesis and status
    multi.hSet(sessionKey, {
      synthesis,
      status: 'completed'
    });

    // Move from old status set to completed set
    multi.sRem(this.getSessionsByStatusKey('active'), sessionId);
    multi.sRem(this.getSessionsByStatusKey('synthesizing'), sessionId);
    multi.sAdd(this.getSessionsByStatusKey('completed'), sessionId);

    await multi.exec();
  }

  async cleanupOldSessions(maxAge: number): Promise<number> {
    await this.initialize();

    const cutoffDate = new Date(Date.now() - maxAge);
    const sessionIds = await this.client.sMembers(this.getSessionListKey());
    
    let deletedCount = 0;

    for (const sessionId of sessionIds) {
      const sessionKey = this.getSessionKey(sessionId);
      const startedAt = await this.client.hGet(sessionKey, 'startedAt');
      
      if (startedAt && new Date(startedAt) < cutoffDate) {
        await this.deleteSession(sessionId);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      await this.initialize();
      
      // Test with a simple ping
      const result = await this.client.ping();
      
      if (result === 'PONG') {
        return { status: 'healthy' };
      } else {
        return { status: 'unhealthy', details: 'Ping failed' };
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}