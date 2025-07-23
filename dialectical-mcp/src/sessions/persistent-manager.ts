import { DebateSession } from './manager.js';
import { SessionStorage } from '../storage/types.js';
import { createStorageFromEnv } from '../storage/factory.js';

/**
 * Enhanced SessionManager with persistent storage support
 */
export class PersistentSessionManager {
  private storage: SessionStorage;
  private initialized = false;

  constructor(storage?: SessionStorage) {
    this.storage = storage || createStorageFromEnv();
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.storage.initialize();
      this.initialized = true;
    }
  }

  async createSession(topic: string, context?: string): Promise<string> {
    await this.initialize();

    const id = `debate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const session: DebateSession = {
      id,
      startedAt: new Date(),
      topic,
      context,
      critiques: new Map(),
      metadata: {
        participatingPersonas: [],
        status: 'active'
      }
    };

    await this.storage.saveSession(session);
    return id;
  }

  async getSession(id: string): Promise<DebateSession | null> {
    await this.initialize();
    return await this.storage.getSession(id);
  }

  async addCritique(sessionId: string, persona: string, critique: string): Promise<void> {
    await this.initialize();
    await this.storage.addCritique(sessionId, persona, critique);
  }

  async addSynthesis(sessionId: string, synthesis: string): Promise<void> {
    await this.initialize();
    await this.storage.addSynthesis(sessionId, synthesis);
  }

  async getSessionContext(sessionId: string): Promise<string> {
    await this.initialize();
    const session = await this.storage.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    let context = `## Debate Session: ${session.topic}\n\n`;
    
    if (session.context) {
      context += `### Context\n${session.context}\n\n`;
    }

    if (session.critiques.size > 0) {
      context += `### Previous Critiques\n\n`;
      for (const [persona, critique] of session.critiques) {
        context += `#### ${persona.toUpperCase()}\n${critique}\n\n`;
      }
    }

    return context;
  }

  async listActiveSessions(): Promise<DebateSession[]> {
    await this.initialize();
    return await this.storage.listSessions({ status: 'active' });
  }

  async listAllSessions(filter?: {
    status?: 'active' | 'synthesizing' | 'completed';
    limit?: number;
    offset?: number;
    since?: Date;
  }): Promise<DebateSession[]> {
    await this.initialize();
    return await this.storage.listSessions(filter);
  }

  async deleteSession(id: string): Promise<void> {
    await this.initialize();
    await this.storage.deleteSession(id);
  }

  async cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    await this.initialize();
    return await this.storage.cleanupOldSessions(maxAge);
  }

  async updateSessionStatus(sessionId: string, status: 'active' | 'synthesizing' | 'completed'): Promise<void> {
    await this.initialize();
    const session = await this.storage.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.metadata.status = status;
    await this.storage.updateSession(session);
  }

  async updateSessionMetadata(sessionId: string, metadata: Partial<DebateSession['metadata']>): Promise<void> {
    await this.initialize();
    const session = await this.storage.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.metadata = { ...session.metadata, ...metadata };
    await this.storage.updateSession(session);
  }

  async getStorageHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    await this.initialize();
    return await this.storage.healthCheck();
  }

  async close(): Promise<void> {
    if (this.initialized) {
      await this.storage.close();
      this.initialized = false;
    }
  }

  /**
   * Export session data for backup or analysis
   */
  async exportSessions(filter?: {
    status?: 'active' | 'synthesizing' | 'completed';
    since?: Date;
    limit?: number;
  }): Promise<DebateSession[]> {
    await this.initialize();
    return await this.storage.listSessions({
      ...filter,
      limit: filter?.limit || 1000 // Default to large limit for export
    });
  }

  /**
   * Get session statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    completed: number;
    synthesizing: number;
    avgCritiquesPerSession: number;
    avgSessionDuration?: number;
  }> {
    await this.initialize();

    const [active, completed, synthesizing] = await Promise.all([
      this.storage.listSessions({ status: 'active' }),
      this.storage.listSessions({ status: 'completed' }),
      this.storage.listSessions({ status: 'synthesizing' })
    ]);

    const allSessions = [...active, ...completed, ...synthesizing];
    
    const avgCritiques = allSessions.length > 0 
      ? allSessions.reduce((sum, s) => sum + s.critiques.size, 0) / allSessions.length 
      : 0;

    // Calculate average session duration for completed sessions
    let avgDuration: number | undefined;
    const completedWithSynthesis = completed.filter(s => s.synthesis);
    if (completedWithSynthesis.length > 0) {
      const totalDuration = completedWithSynthesis.reduce((sum, session) => {
        // Estimate completion time as start time + some default duration
        // In a real implementation, you'd track actual completion timestamps
        return sum + (60 * 60 * 1000); // Assume 1 hour average for now
      }, 0);
      avgDuration = totalDuration / completedWithSynthesis.length;
    }

    return {
      total: allSessions.length,
      active: active.length,
      completed: completed.length,
      synthesizing: synthesizing.length,
      avgCritiquesPerSession: Math.round(avgCritiques * 100) / 100,
      avgSessionDuration: avgDuration
    };
  }
}