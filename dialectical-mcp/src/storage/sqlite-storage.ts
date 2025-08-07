import Database from 'better-sqlite3';
import { DebateSession } from '../sessions/manager.js';
import { SessionStorage, SerializedDebateSession, serializeSession, deserializeSession } from './types.js';
import { join } from 'path';

export class SQLiteStorage implements SessionStorage {
  private db: Database.Database;
  private initialized = false;

  constructor(dbPath?: string) {
    const path = dbPath || join(process.cwd(), 'data', 'dialectical.db');
    this.db = new Database(path);
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        topic TEXT NOT NULL,
        context TEXT,
        synthesis TEXT,
        total_tokens INTEGER,
        participating_personas TEXT, -- JSON array
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create critiques table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS critiques (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        persona TEXT NOT NULL,
        critique TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
        UNIQUE(session_id, persona)
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
      CREATE INDEX IF NOT EXISTS idx_critiques_session_id ON critiques(session_id);
    `);

    // Create trigger to update updated_at
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_sessions_updated_at
      AFTER UPDATE ON sessions
      FOR EACH ROW
      BEGIN
        UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);

    this.initialized = true;
  }

  async saveSession(session: DebateSession): Promise<void> {
    await this.initialize();

    const serialized = serializeSession(session);
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (
        id, started_at, topic, context, synthesis, 
        total_tokens, participating_personas, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      serialized.id,
      serialized.startedAt,
      serialized.topic,
      serialized.context,
      serialized.synthesis,
      serialized.metadata.totalTokens,
      JSON.stringify(serialized.metadata.participatingPersonas),
      serialized.metadata.status
    ]);

    // Save critiques
    const deleteCritiques = this.db.prepare('DELETE FROM critiques WHERE session_id = ?');
    const insertCritique = this.db.prepare(`
      INSERT INTO critiques (session_id, persona, critique) VALUES (?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      deleteCritiques.run(session.id);
      for (const [persona, critique] of session.critiques) {
        insertCritique.run(session.id, persona, critique);
      }
    });

    transaction();
  }

  async getSession(id: string): Promise<DebateSession | null> {
    await this.initialize();

    const sessionStmt = this.db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `);
    
    const critiquesStmt = this.db.prepare(`
      SELECT persona, critique FROM critiques WHERE session_id = ?
    `);

    const sessionRow = sessionStmt.get(id) as any;
    if (!sessionRow) return null;

    const critiquesRows = critiquesStmt.all(id) as any[];
    
    const critiques: Record<string, string> = {};
    for (const row of critiquesRows) {
      critiques[row.persona] = row.critique;
    }

    const serialized: SerializedDebateSession = {
      id: sessionRow.id,
      startedAt: sessionRow.started_at,
      topic: sessionRow.topic,
      context: sessionRow.context,
      synthesis: sessionRow.synthesis,
      critiques,
      metadata: {
        totalTokens: sessionRow.total_tokens,
        participatingPersonas: JSON.parse(sessionRow.participating_personas || '[]'),
        status: sessionRow.status
      }
    };

    return deserializeSession(serialized);
  }

  async updateSession(session: DebateSession): Promise<void> {
    await this.saveSession(session); // SQLite uses UPSERT
  }

  async deleteSession(id: string): Promise<void> {
    await this.initialize();
    
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(id);
  }

  async listSessions(filter?: {
    status?: 'active' | 'synthesizing' | 'completed';
    limit?: number;
    offset?: number;
    since?: Date;
  }): Promise<DebateSession[]> {
    await this.initialize();

    let query = `
      SELECT s.*, 
             GROUP_CONCAT(c.persona || ':' || c.critique, '|||') as critiques_data
      FROM sessions s
      LEFT JOIN critiques c ON s.id = c.session_id
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.status) {
      conditions.push('s.status = ?');
      params.push(filter.status);
    }

    if (filter?.since) {
      conditions.push('s.started_at >= ?');
      params.push(filter.since.toISOString());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY s.id ORDER BY s.started_at DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter?.offset) {
      query += ' OFFSET ?';
      params.push(filter.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => {
      const critiques: Record<string, string> = {};
      
      if (row.critiques_data) {
        const critiquePairs = row.critiques_data.split('|||');
        for (const pair of critiquePairs) {
          const [persona, critique] = pair.split(':', 2);
          if (persona && critique) {
            critiques[persona] = critique;
          }
        }
      }

      const serialized: SerializedDebateSession = {
        id: row.id,
        startedAt: row.started_at,
        topic: row.topic,
        context: row.context,
        synthesis: row.synthesis,
        critiques,
        metadata: {
          totalTokens: row.total_tokens,
          participatingPersonas: JSON.parse(row.participating_personas || '[]'),
          status: row.status
        }
      };

      return deserializeSession(serialized);
    });
  }

  async addCritique(sessionId: string, persona: string, critique: string): Promise<void> {
    await this.initialize();

    // First update the session's participating personas
    const updateSessionStmt = this.db.prepare(`
      UPDATE sessions 
      SET participating_personas = json_insert(
        COALESCE(participating_personas, '[]'),
        '$[#]',
        ?
      )
      WHERE id = ? AND NOT EXISTS (
        SELECT 1 FROM json_each(participating_personas) 
        WHERE value = ?
      )
    `);

    // Insert or update critique
    const insertCritiqueStmt = this.db.prepare(`
      INSERT OR REPLACE INTO critiques (session_id, persona, critique) 
      VALUES (?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      updateSessionStmt.run(persona, sessionId, persona);
      insertCritiqueStmt.run(sessionId, persona, critique);
    });

    transaction();
  }

  async addSynthesis(sessionId: string, synthesis: string): Promise<void> {
    await this.initialize();

    const stmt = this.db.prepare(`
      UPDATE sessions 
      SET synthesis = ?, status = 'completed' 
      WHERE id = ?
    `);

    stmt.run(synthesis, sessionId);
  }

  async cleanupOldSessions(maxAge: number): Promise<number> {
    await this.initialize();

    const cutoffDate = new Date(Date.now() - maxAge).toISOString();
    
    const stmt = this.db.prepare(`
      DELETE FROM sessions 
      WHERE started_at < ?
    `);

    const result = stmt.run(cutoffDate);
    return result.changes;
  }

  async close(): Promise<void> {
    this.db.close();
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      await this.initialize();
      
      // Test with a simple query
      const stmt = this.db.prepare('SELECT 1 as test');
      const result = stmt.get();
      
      if (result && (result as any).test === 1) {
        return { status: 'healthy' };
      } else {
        return { status: 'unhealthy', details: 'Test query failed' };
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}