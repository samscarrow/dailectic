import { DebateSession } from '../sessions/manager.js';

export interface SessionStorage {
  /**
   * Save a session to persistent storage
   */
  saveSession(session: DebateSession): Promise<void>;

  /**
   * Retrieve a session by ID
   */
  getSession(id: string): Promise<DebateSession | null>;

  /**
   * Update an existing session
   */
  updateSession(session: DebateSession): Promise<void>;

  /**
   * Delete a session
   */
  deleteSession(id: string): Promise<void>;

  /**
   * List sessions with optional filtering
   */
  listSessions(filter?: {
    status?: 'active' | 'synthesizing' | 'completed';
    limit?: number;
    offset?: number;
    since?: Date;
  }): Promise<DebateSession[]>;

  /**
   * Add a critique to a session
   */
  addCritique(sessionId: string, persona: string, critique: string): Promise<void>;

  /**
   * Add synthesis to a session
   */
  addSynthesis(sessionId: string, synthesis: string): Promise<void>;

  /**
   * Clean up old sessions
   */
  cleanupOldSessions(maxAge: number): Promise<number>;

  /**
   * Initialize storage (create tables, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Close storage connections
   */
  close(): Promise<void>;

  /**
   * Get storage health status
   */
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }>;
}

/**
 * Serializable version of DebateSession for storage
 */
export interface SerializedDebateSession {
  id: string;
  startedAt: string; // ISO date string
  topic: string;
  context?: string;
  critiques: Record<string, string>; // Map as object
  synthesis?: string;
  metadata: {
    totalTokens?: number;
    participatingPersonas: string[];
    status: 'active' | 'synthesizing' | 'completed';
  };
}

/**
 * Convert DebateSession to serializable format
 */
export function serializeSession(session: DebateSession): SerializedDebateSession {
  return {
    ...session,
    startedAt: session.startedAt.toISOString(),
    critiques: Object.fromEntries(session.critiques.entries())
  };
}

/**
 * Convert serialized format back to DebateSession
 */
export function deserializeSession(serialized: SerializedDebateSession): DebateSession {
  return {
    ...serialized,
    startedAt: new Date(serialized.startedAt),
    critiques: new Map(Object.entries(serialized.critiques))
  };
}