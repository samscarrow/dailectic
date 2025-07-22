export interface DebateSession {
  id: string;
  startedAt: Date;
  topic: string;
  context?: string;
  critiques: Map<string, string>;
  synthesis?: string;
  metadata: {
    totalTokens?: number;
    participatingPersonas: string[];
    status: 'active' | 'synthesizing' | 'completed';
  };
}

export class SessionManager {
  private sessions: Map<string, DebateSession> = new Map();

  createSession(topic: string, context?: string): string {
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
    this.sessions.set(id, session);
    return id;
  }

  getSession(id: string): DebateSession | undefined {
    return this.sessions.get(id);
  }

  addCritique(sessionId: string, persona: string, critique: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    session.critiques.set(persona, critique);
    if (!session.metadata.participatingPersonas.includes(persona)) {
      session.metadata.participatingPersonas.push(persona);
    }
  }

  addSynthesis(sessionId: string, synthesis: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    session.synthesis = synthesis;
    session.metadata.status = 'completed';
  }

  getSessionContext(sessionId: string): string {
    const session = this.sessions.get(sessionId);
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

  listActiveSessions(): DebateSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.metadata.status === 'active')
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.startedAt.getTime() > maxAge) {
        this.sessions.delete(id);
      }
    }
  }
}