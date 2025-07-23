import { SessionStorage } from './types.js';
import { SQLiteStorage } from './sqlite-storage.js';
import { RedisStorage } from './redis-storage.js';

export type StorageType = 'memory' | 'sqlite' | 'redis' | 'digitalocean-redis';

export interface StorageConfig {
  type: StorageType;
  
  // SQLite options
  sqlitePath?: string;
  
  // Redis options
  redisUrl?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  redisDb?: number;
  redisKeyPrefix?: string;
  
  // Digital Ocean Redis options
  doRedisConnectionString?: string;
}

/**
 * In-memory storage implementation (original behavior)
 */
class MemoryStorage implements SessionStorage {
  private sessions = new Map<string, any>();
  
  async saveSession(session: any): Promise<void> {
    this.sessions.set(session.id, { ...session });
  }
  
  async getSession(id: string): Promise<any> {
    return this.sessions.get(id) || null;
  }
  
  async updateSession(session: any): Promise<void> {
    this.sessions.set(session.id, { ...session });
  }
  
  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }
  
  async listSessions(filter?: any): Promise<any[]> {
    const sessions = Array.from(this.sessions.values());
    
    // Apply basic filtering
    let filtered = sessions;
    
    if (filter?.status) {
      filtered = filtered.filter(s => s.metadata?.status === filter.status);
    }
    
    if (filter?.since) {
      filtered = filtered.filter(s => new Date(s.startedAt) >= filter.since);
    }
    
    // Sort by date
    filtered.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    // Apply pagination
    const offset = filter?.offset || 0;
    const limit = filter?.limit || filtered.length;
    
    return filtered.slice(offset, offset + limit);
  }
  
  async addCritique(sessionId: string, persona: string, critique: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    if (!session.critiques) session.critiques = new Map();
    session.critiques.set(persona, critique);
    
    if (!session.metadata.participatingPersonas.includes(persona)) {
      session.metadata.participatingPersonas.push(persona);
    }
  }
  
  async addSynthesis(sessionId: string, synthesis: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    session.synthesis = synthesis;
    session.metadata.status = 'completed';
  }
  
  async cleanupOldSessions(maxAge: number): Promise<number> {
    const cutoff = Date.now() - maxAge;
    let count = 0;
    
    for (const [id, session] of this.sessions) {
      if (new Date(session.startedAt).getTime() < cutoff) {
        this.sessions.delete(id);
        count++;
      }
    }
    
    return count;
  }
  
  async initialize(): Promise<void> {
    // No initialization needed for memory storage
  }
  
  async close(): Promise<void> {
    this.sessions.clear();
  }
  
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    return { status: 'healthy' };
  }
}

/**
 * Create a storage instance based on configuration
 */
export function createStorage(config: StorageConfig): SessionStorage {
  switch (config.type) {
    case 'memory':
      return new MemoryStorage();
      
    case 'sqlite':
      return new SQLiteStorage(config.sqlitePath);
      
    case 'redis':
      return new RedisStorage({
        url: config.redisUrl,
        host: config.redisHost,
        port: config.redisPort,
        password: config.redisPassword,
        db: config.redisDb,
        keyPrefix: config.redisKeyPrefix
      });
      
    case 'digitalocean-redis':
      if (!config.doRedisConnectionString) {
        throw new Error('Digital Ocean Redis connection string is required');
      }
      return new RedisStorage({
        url: config.doRedisConnectionString,
        keyPrefix: config.redisKeyPrefix
      });
      
    default:
      throw new Error(`Unsupported storage type: ${config.type}`);
  }
}

/**
 * Create storage from environment variables
 */
export function createStorageFromEnv(): SessionStorage {
  const storageType = (process.env.STORAGE_TYPE || 'memory') as StorageType;
  
  const config: StorageConfig = {
    type: storageType,
    
    // SQLite
    sqlitePath: process.env.SQLITE_PATH,
    
    // Redis
    redisUrl: process.env.REDIS_URL,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined,
    redisPassword: process.env.REDIS_PASSWORD,
    redisDb: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : undefined,
    redisKeyPrefix: process.env.REDIS_KEY_PREFIX,
    
    // Digital Ocean Redis
    doRedisConnectionString: process.env.DO_REDIS_CONNECTION_STRING
  };
  
  return createStorage(config);
}