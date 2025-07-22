import { KnowledgeStore } from '../../src/knowledge-store/knowledge-store.js';
import { IGraphRepository, IDocumentRepository } from '../../src/knowledge-store/interfaces.js';
import { PersonaNode, TopicNode, DebateSessionDocument, ExpertiseRelation } from '../../src/knowledge-store/types.js';

// Mock implementations for testing
class MockGraphRepository implements IGraphRepository {
  private personas = new Map<string, PersonaNode>();
  private topics = new Map<string, TopicNode>();
  private concepts = new Map<string, any>();
  private expertise = new Map<string, ExpertiseRelation[]>();
  private conflicts = new Map<string, any[]>();

  // Persona operations
  async createPersonaNode(persona: Omit<PersonaNode, 'createdAt' | 'updatedAt'>): Promise<PersonaNode> {
    const now = new Date();
    const fullPersona: PersonaNode = {
      ...persona,
      createdAt: now,
      updatedAt: now
    };
    this.personas.set(persona.id, fullPersona);
    return fullPersona;
  }

  async getPersonaNode(id: string): Promise<PersonaNode | null> {
    return this.personas.get(id) || null;
  }

  async updatePersonaNode(id: string, updates: Partial<PersonaNode>): Promise<PersonaNode> {
    const existing = this.personas.get(id);
    if (!existing) throw new Error(`Persona ${id} not found`);
    
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.personas.set(id, updated);
    return updated;
  }

  async deletePersonaNode(id: string): Promise<boolean> {
    return this.personas.delete(id);
  }

  // Topic operations
  async createTopicNode(topic: Omit<TopicNode, 'createdAt'>): Promise<TopicNode> {
    const fullTopic: TopicNode = {
      ...topic,
      createdAt: new Date()
    };
    this.topics.set(topic.id, fullTopic);
    return fullTopic;
  }

  async getTopicNode(id: string): Promise<TopicNode | null> {
    return this.topics.get(id) || null;
  }

  async updateTopicNode(id: string, updates: Partial<TopicNode>): Promise<TopicNode> {
    const existing = this.topics.get(id);
    if (!existing) throw new Error(`Topic ${id} not found`);
    
    const updated = { ...existing, ...updates };
    this.topics.set(id, updated);
    return updated;
  }

  async deleteTopicNode(id: string): Promise<boolean> {
    return this.topics.delete(id);
  }

  // Concept operations (simplified for testing)
  async createConceptNode(concept: any): Promise<any> {
    this.concepts.set(concept.id, { ...concept, createdAt: new Date() });
    return this.concepts.get(concept.id);
  }

  async getConceptNode(id: string): Promise<any> {
    return this.concepts.get(id) || null;
  }

  async deleteConceptNode(id: string): Promise<boolean> {
    return this.concepts.delete(id);
  }

  // Relationship operations
  async createExpertiseRelation(relation: ExpertiseRelation): Promise<void> {
    const existing = this.expertise.get(relation.from) || [];
    existing.push(relation);
    this.expertise.set(relation.from, existing);
  }

  async createConflictRelation(relation: any): Promise<void> {
    const existing = this.conflicts.get(relation.from) || [];
    existing.push(relation);
    this.conflicts.set(relation.from, existing);
  }

  async createConceptDependency(dependency: any): Promise<void> {
    // Simplified implementation
  }

  async getPersonaExpertise(personaId: string): Promise<ExpertiseRelation[]> {
    return this.expertise.get(personaId) || [];
  }

  async getTopicExperts(topicId: string): Promise<ExpertiseRelation[]> {
    const allExpertise: ExpertiseRelation[] = [];
    for (const [persona, expertiseList] of this.expertise) {
      const relevantExpertise = expertiseList.filter(e => e.to === topicId);
      allExpertise.push(...relevantExpertise);
    }
    return allExpertise.sort((a, b) => b.confidence - a.confidence);
  }

  async getPersonaConflicts(personaId: string): Promise<any[]> {
    return this.conflicts.get(personaId) || [];
  }

  async getConceptDependencies(conceptId: string): Promise<any[]> {
    return [];
  }

  async updateExpertiseRelation(from: string, to: string, updates: Partial<ExpertiseRelation>): Promise<void> {
    const expertiseList = this.expertise.get(from) || [];
    const relationIndex = expertiseList.findIndex(e => e.to === to);
    if (relationIndex >= 0) {
      expertiseList[relationIndex] = { ...expertiseList[relationIndex], ...updates };
    }
  }

  async deleteExpertiseRelation(from: string, to: string): Promise<boolean> {
    const expertiseList = this.expertise.get(from) || [];
    const initialLength = expertiseList.length;
    const filtered = expertiseList.filter(e => e.to !== to);
    this.expertise.set(from, filtered);
    return filtered.length < initialLength;
  }

  async deleteConflictRelation(from: string, to: string): Promise<boolean> {
    return true; // Simplified
  }

  // Complex queries
  async recommendPersonasForTopic(topicId: string, limit = 5): Promise<Array<{ persona: PersonaNode; score: number }>> {
    const experts = await this.getTopicExperts(topicId);
    const recommendations: Array<{ persona: PersonaNode; score: number }> = [];
    
    for (const expertise of experts.slice(0, limit)) {
      const persona = await this.getPersonaNode(expertise.from);
      if (persona) {
        const score = expertise.confidence * (expertise.strength === 'expert' ? 4 : expertise.strength === 'advanced' ? 3 : 2);
        recommendations.push({ persona, score });
      }
    }
    
    return recommendations.sort((a, b) => b.score - a.score);
  }

  async findConflictingPersonas(personaIds: string[]): Promise<any[]> {
    const conflicts: any[] = [];
    for (const personaId of personaIds) {
      const personaConflicts = await this.getPersonaConflicts(personaId);
      conflicts.push(...personaConflicts.filter(c => personaIds.includes(c.to)));
    }
    return conflicts;
  }

  async discoverLearningPath(fromConcept: string, toConcept: string): Promise<any[]> {
    return []; // Simplified for testing
  }

  // Analytics (simplified)
  async getPersonaInsights(personaId: string): Promise<any> {
    const expertise = await this.getPersonaExpertise(personaId);
    return {
      personaId,
      totalCritiques: 0,
      averageConfidence: expertise.reduce((sum, e) => sum + e.confidence, 0) / expertise.length || 0,
      expertiseAreas: expertise.map(e => ({ topic: e.to, strength: e.confidence })),
      commonThemes: [],
      performanceMetrics: { averageResponseTime: 1000, qualityScore: 0.8 }
    };
  }

  async getTopicInsights(topicId: string): Promise<any> {
    return {
      topicId,
      totalDiscussions: 0,
      averageComplexity: 5,
      expertPersonas: [],
      commonIssues: [],
      resolutionPatterns: []
    };
  }

  async getSystemMetrics(): Promise<any> {
    return {
      totalSessions: 0,
      totalCritiques: 0,
      averageSessionDuration: 0,
      popularTopics: [],
      personaUtilization: []
    };
  }
}

class MockDocumentRepository implements IDocumentRepository {
  private sessions = new Map<string, DebateSessionDocument>();

  async createSession(session: Omit<DebateSessionDocument, '_id'>): Promise<DebateSessionDocument> {
    const fullSession: DebateSessionDocument = {
      ...session,
      _id: `doc_${Date.now()}`
    };
    this.sessions.set(session.sessionId, fullSession);
    return fullSession;
  }

  async getSession(sessionId: string): Promise<DebateSessionDocument | null> {
    return this.sessions.get(sessionId) || null;
  }

  async updateSession(sessionId: string, updates: Partial<DebateSessionDocument>): Promise<DebateSessionDocument> {
    const existing = this.sessions.get(sessionId);
    if (!existing) throw new Error(`Session ${sessionId} not found`);
    
    const updated = { ...existing, ...updates };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async searchSessions(query: any): Promise<any> {
    const allSessions = Array.from(this.sessions.values());
    return {
      items: allSessions.slice(0, query.limit || 20),
      totalCount: allSessions.length,
      hasMore: false,
      searchTime: 50
    };
  }

  async getSessionsByTopic(topic: string, limit = 20): Promise<DebateSessionDocument[]> {
    const allSessions = Array.from(this.sessions.values());
    return allSessions.filter(s => s.topic.toLowerCase().includes(topic.toLowerCase())).slice(0, limit);
  }

  async getSessionsByPersona(personaId: string, limit = 20): Promise<DebateSessionDocument[]> {
    const allSessions = Array.from(this.sessions.values());
    return allSessions.filter(s => s.participants.includes(personaId)).slice(0, limit);
  }

  async getActiveSessions(): Promise<DebateSessionDocument[]> {
    const allSessions = Array.from(this.sessions.values());
    return allSessions.filter(s => s.metadata.status === 'active');
  }

  async addCritiqueToSession(sessionId: string, critique: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.critiques.push(critique);
      if (!session.participants.includes(critique.persona)) {
        session.participants.push(critique.persona);
      }
    }
  }

  async setSynthesis(sessionId: string, synthesis: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.synthesis = synthesis;
      session.metadata.status = 'completed';
      session.completedAt = new Date();
    }
  }

  async searchContent(text: string, filters?: any): Promise<any> {
    return this.searchSessions({ text, filters });
  }

  async archiveOldSessions(beforeDate: Date): Promise<number> {
    let archived = 0;
    for (const [id, session] of this.sessions) {
      if (session.startedAt < beforeDate) {
        session.metadata.status = 'archived';
        archived++;
      }
    }
    return archived;
  }

  async cleanupSessions(criteria: any): Promise<number> {
    const initialSize = this.sessions.size;
    for (const [id, session] of this.sessions) {
      if (criteria.status && session.metadata.status === criteria.status) {
        this.sessions.delete(id);
      }
    }
    return initialSize - this.sessions.size;
  }
}

describe('KnowledgeStore Integration Tests', () => {
  let knowledgeStore: KnowledgeStore;
  let mockGraphRepo: MockGraphRepository;
  let mockDocRepo: MockDocumentRepository;

  beforeEach(() => {
    mockGraphRepo = new MockGraphRepository();
    mockDocRepo = new MockDocumentRepository();
    
    const config = {
      graph: {
        type: 'neo4j' as const,
        connection: { host: 'localhost', port: 7687, database: 'test' }
      },
      documents: {
        type: 'mongodb' as const,
        connection: { host: 'localhost', port: 27017, database: 'test' }
      },
      security: {
        enablePIIRedaction: false,
        enableAuditLogging: false,
        requireHumanApproval: false
      }
    };

    knowledgeStore = new KnowledgeStore(mockGraphRepo, mockDocRepo, config);
  });

  describe('Repository Integration', () => {
    it('should provide access to both graph and document repositories', () => {
      expect(knowledgeStore.graph).toBeDefined();
      expect(knowledgeStore.documents).toBeDefined();
      expect(knowledgeStore.graph).toBe(mockGraphRepo);
      expect(knowledgeStore.documents).toBe(mockDocRepo);
    });
  });

  describe('Persona Initialization', () => {
    it('should initialize personas in graph repository', async () => {
      const testPersonas = [
        {
          id: 'helios',
          name: 'Helios',
          emoji: '🧑‍💻',
          role: 'The Pragmatist',
          coreGoal: 'Ship working code quickly',
          values: ['Simplicity', 'Velocity']
        },
        {
          id: 'selene',
          name: 'Selene',
          emoji: '🏛️',
          role: 'The Architect',
          coreGoal: 'Build scalable systems',
          values: ['Robustness', 'Maintainability']
        }
      ];

      await knowledgeStore.initializePersonas(testPersonas);

      // Verify personas were created
      const helios = await knowledgeStore.graph.getPersonaNode('helios');
      const selene = await knowledgeStore.graph.getPersonaNode('selene');

      expect(helios).toBeDefined();
      expect(helios?.name).toBe('Helios');
      expect(selene).toBeDefined();
      expect(selene?.name).toBe('Selene');
    });

    it('should update existing personas rather than create duplicates', async () => {
      const initialPersona = {
        id: 'test-persona',
        name: 'Initial Name',
        emoji: '🤖',
        role: 'Tester',
        coreGoal: 'Test things',
        values: ['Testing']
      };

      await knowledgeStore.initializePersonas([initialPersona]);
      
      const updatedPersona = {
        ...initialPersona,
        name: 'Updated Name',
        values: ['Testing', 'Quality']
      };

      await knowledgeStore.initializePersonas([updatedPersona]);

      const result = await knowledgeStore.graph.getPersonaNode('test-persona');
      expect(result?.name).toBe('Updated Name');
      expect(result?.values).toContain('Quality');
    });
  });

  describe('Learning from Sessions', () => {
    it('should learn from completed debate sessions', async () => {
      // Create a test session
      const session: Omit<DebateSessionDocument, '_id'> = {
        sessionId: 'test-session-1',
        topic: 'security best practices',
        startedAt: new Date(),
        completedAt: new Date(),
        participants: ['cassandra', 'selene'],
        critiques: [
          {
            persona: 'cassandra',
            content: 'This approach has security vulnerabilities',
            timestamp: new Date(),
            metadata: {
              confidence: 0.9,
              severity: 'high',
              tags: ['security', 'vulnerability']
            }
          },
          {
            persona: 'selene',
            content: 'The architecture needs better separation of concerns',
            timestamp: new Date(),
            metadata: {
              confidence: 0.8,
              tags: ['architecture', 'design']
            }
          }
        ],
        metadata: {
          status: 'completed',
          totalTokens: 1500,
          version: '4.0.0',
          workflowType: 'sequential'
        },
        tags: ['security', 'architecture']
      };

      await knowledgeStore.documents.createSession(session);

      // Initialize personas and topics first
      await knowledgeStore.initializePersonas([
        { id: 'cassandra', name: 'Cassandra', emoji: '🕵️', role: 'Risk Analyst', coreGoal: 'Identify risks', values: ['Security'] },
        { id: 'selene', name: 'Selene', emoji: '🏛️', role: 'Architect', coreGoal: 'Design systems', values: ['Architecture'] }
      ]);

      // Learn from the session
      await knowledgeStore.learnFromSession('test-session-1');

      // Verify learning occurred (this would update expertise relationships)
      const cassandraExpertise = await knowledgeStore.graph.getPersonaExpertise('cassandra');
      const seleneExpertise = await knowledgeStore.graph.getPersonaExpertise('selene');

      // At minimum, we should have some expertise recorded
      expect(cassandraExpertise.length).toBeGreaterThan(0);
      expect(seleneExpertise.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent or incomplete sessions', async () => {
      await expect(knowledgeStore.learnFromSession('non-existent-session'))
        .rejects.toThrow('Session non-existent-session not found or not completed');
    });

    it('should throw error for active sessions', async () => {
      // Create an active session
      const activeSession: Omit<DebateSessionDocument, '_id'> = {
        sessionId: 'active-session',
        topic: 'test topic',
        startedAt: new Date(),
        participants: ['helios'],
        critiques: [],
        metadata: {
          status: 'active',
          version: '4.0.0',
          workflowType: 'sequential'
        },
        tags: []
      };

      await knowledgeStore.documents.createSession(activeSession);

      await expect(knowledgeStore.learnFromSession('active-session'))
        .rejects.toThrow('Session active-session not found or not completed');
    });
  });

  describe('Persona Performance Analytics', () => {
    it('should combine graph insights with session history', async () => {
      // Set up test data
      const personaId = 'helios';
      
      await knowledgeStore.initializePersonas([
        { id: personaId, name: 'Helios', emoji: '🧑‍💻', role: 'Pragmatist', coreGoal: 'Ship fast', values: ['Speed'] }
      ]);

      // Create some test sessions
      const sessions: Omit<DebateSessionDocument, '_id'>[] = [
        {
          sessionId: 'perf-session-1',
          topic: 'implementation',
          startedAt: new Date(Date.now() - 86400000), // 1 day ago
          participants: [personaId],
          critiques: [{
            persona: personaId,
            content: 'Quick implementation suggested',
            timestamp: new Date(),
            metadata: { confidence: 0.8, tags: ['implementation'] }
          }],
          metadata: { status: 'completed', version: '4.0.0', workflowType: 'sequential' },
          tags: ['implementation']
        },
        {
          sessionId: 'perf-session-2',
          topic: 'debugging',
          startedAt: new Date(Date.now() - 43200000), // 12 hours ago
          participants: [personaId],
          critiques: [{
            persona: personaId,
            content: 'Found the bug quickly',
            timestamp: new Date(),
            metadata: { confidence: 0.9, tags: ['debugging'] }
          }],
          metadata: { status: 'completed', version: '4.0.0', workflowType: 'sequential' },
          tags: ['debugging']
        }
      ];

      for (const session of sessions) {
        await knowledgeStore.documents.createSession(session);
      }

      // Add some expertise to graph
      await knowledgeStore.graph.createExpertiseRelation({
        from: personaId,
        to: 'implementation',
        strength: 'advanced',
        confidence: 0.85,
        evidence: ['Multiple successful implementations'],
        updatedAt: new Date()
      });

      const performance = await knowledgeStore.getPersonaPerformance(personaId);

      expect(performance).toHaveProperty('graphInsights');
      expect(performance).toHaveProperty('sessionHistory');
      expect(performance).toHaveProperty('overallScore');

      expect(performance.graphInsights.personaId).toBe(personaId);
      expect(performance.sessionHistory).toHaveLength(2);
      expect(performance.overallScore).toBeGreaterThan(0);
      expect(performance.overallScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Health Check', () => {
    it('should return health status for both repositories', async () => {
      const health = await knowledgeStore.healthCheck();

      expect(health).toHaveProperty('graph');
      expect(health).toHaveProperty('documents');

      expect(health.graph).toHaveProperty('connected');
      expect(health.graph).toHaveProperty('nodeCount');
      expect(health.graph).toHaveProperty('relationshipCount');

      expect(health.documents).toHaveProperty('connected');
      expect(health.documents).toHaveProperty('documentCount');
      expect(health.documents).toHaveProperty('indexHealth');
    });

    it('should report healthy status for mock repositories', async () => {
      const health = await knowledgeStore.healthCheck();

      expect(health.graph.connected).toBe(true);
      expect(health.documents.connected).toBe(true);
    });
  });

  describe('Cross-Repository Queries', () => {
    it('should correlate personas from graph with their session activity', async () => {
      const personaId = 'prometheus';
      
      // Create persona in graph
      await knowledgeStore.initializePersonas([
        { id: personaId, name: 'Prometheus', emoji: '🚀', role: 'Innovator', coreGoal: 'Innovate', values: ['Innovation'] }
      ]);

      // Create session in document store
      const session: Omit<DebateSessionDocument, '_id'> = {
        sessionId: 'cross-repo-session',
        topic: 'innovation',
        startedAt: new Date(),
        participants: [personaId],
        critiques: [{
          persona: personaId,
          content: 'Innovative approach suggested',
          timestamp: new Date(),
          metadata: { confidence: 0.9, tags: ['innovation'] }
        }],
        metadata: { status: 'completed', version: '4.0.0', workflowType: 'sequential' },
        tags: ['innovation']
      };

      await knowledgeStore.documents.createSession(session);

      // Test cross-repository correlation
      const [graphPersona, documentSessions] = await Promise.all([
        knowledgeStore.graph.getPersonaNode(personaId),
        knowledgeStore.documents.getSessionsByPersona(personaId)
      ]);

      expect(graphPersona).toBeDefined();
      expect(graphPersona?.name).toBe('Prometheus');
      expect(documentSessions).toHaveLength(1);
      expect(documentSessions[0].sessionId).toBe('cross-repo-session');
    });

    it('should find topic experts from graph for sessions in document store', async () => {
      const topicId = 'machine-learning';
      
      // Set up personas and expertise
      await knowledgeStore.initializePersonas([
        { id: 'expert1', name: 'Expert 1', emoji: '🤖', role: 'ML Expert', coreGoal: 'ML', values: ['ML'] },
        { id: 'expert2', name: 'Expert 2', emoji: '📊', role: 'Data Expert', coreGoal: 'Data', values: ['Data'] }
      ]);

      // Create topic
      await knowledgeStore.graph.createTopicNode({
        id: topicId,
        name: 'Machine Learning',
        category: 'technical',
        complexity: 8
      });

      // Add expertise relationships
      await knowledgeStore.graph.createExpertiseRelation({
        from: 'expert1',
        to: topicId,
        strength: 'expert',
        confidence: 0.95,
        evidence: ['PhD in ML', '10+ years experience'],
        updatedAt: new Date()
      });

      await knowledgeStore.graph.createExpertiseRelation({
        from: 'expert2',
        to: topicId,
        strength: 'advanced',
        confidence: 0.8,
        evidence: ['Data science background'],
        updatedAt: new Date()
      });

      // Get recommendations
      const recommendations = await knowledgeStore.graph.recommendPersonasForTopic(topicId, 2);

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].persona.id).toBe('expert1'); // Should be ranked first
      expect(recommendations[0].score).toBeGreaterThan(recommendations[1].score);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity between repositories', async () => {
      const personaId = 'consistency-test';
      const sessionId = 'consistency-session';

      // Create persona in graph
      await knowledgeStore.initializePersonas([
        { id: personaId, name: 'Test Persona', emoji: '🧪', role: 'Tester', coreGoal: 'Test', values: ['Testing'] }
      ]);

      // Create session referencing the persona
      const session: Omit<DebateSessionDocument, '_id'> = {
        sessionId,
        topic: 'consistency',
        startedAt: new Date(),
        participants: [personaId],
        critiques: [{
          persona: personaId,
          content: 'Consistency is important',
          timestamp: new Date(),
          metadata: { confidence: 1.0, tags: ['consistency'] }
        }],
        metadata: { status: 'completed', version: '4.0.0', workflowType: 'sequential' },
        tags: ['consistency']
      };

      await knowledgeStore.documents.createSession(session);

      // Verify both exist and reference correctly
      const persona = await knowledgeStore.graph.getPersonaNode(personaId);
      const retrievedSession = await knowledgeStore.documents.getSession(sessionId);

      expect(persona).toBeDefined();
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.participants).toContain(personaId);
      expect(retrievedSession?.critiques[0].persona).toBe(personaId);
    });

    it('should handle concurrent access to both repositories', async () => {
      const promises: Promise<any>[] = [];

      // Concurrent persona creation
      for (let i = 0; i < 5; i++) {
        promises.push(
          knowledgeStore.initializePersonas([{
            id: `concurrent-persona-${i}`,
            name: `Concurrent Persona ${i}`,
            emoji: '🔄',
            role: 'Concurrent Tester',
            coreGoal: 'Test concurrency',
            values: ['Concurrency']
          }])
        );
      }

      // Concurrent session creation
      for (let i = 0; i < 5; i++) {
        promises.push(
          knowledgeStore.documents.createSession({
            sessionId: `concurrent-session-${i}`,
            topic: 'concurrency',
            startedAt: new Date(),
            participants: [`concurrent-persona-${i}`],
            critiques: [],
            metadata: { status: 'active', version: '4.0.0', workflowType: 'sequential' },
            tags: ['concurrency']
          })
        );
      }

      await Promise.all(promises);

      // Verify all operations completed successfully
      const personas = await Promise.all(
        Array.from({ length: 5 }, (_, i) => 
          knowledgeStore.graph.getPersonaNode(`concurrent-persona-${i}`)
        )
      );

      const sessions = await Promise.all(
        Array.from({ length: 5 }, (_, i) => 
          knowledgeStore.documents.getSession(`concurrent-session-${i}`)
        )
      );

      personas.forEach(persona => expect(persona).toBeDefined());
      sessions.forEach(session => expect(session).toBeDefined());
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from graph repository', async () => {
      // Mock the graph repository to throw an error
      jest.spyOn(mockGraphRepo, 'getPersonaNode').mockRejectedValue(new Error('Graph database error'));

      await expect(knowledgeStore.graph.getPersonaNode('test-id'))
        .rejects.toThrow('Graph database error');
    });

    it('should propagate errors from document repository', async () => {
      // Mock the document repository to throw an error
      jest.spyOn(mockDocRepo, 'getSession').mockRejectedValue(new Error('Document database error'));

      await expect(knowledgeStore.documents.getSession('test-id'))
        .rejects.toThrow('Document database error');
    });

    it('should handle partial failures gracefully', async () => {
      // Simulate a scenario where graph operations succeed but document operations fail
      const personas = [
        { id: 'partial-fail-test', name: 'Test', emoji: '⚠️', role: 'Failer', coreGoal: 'Fail partially', values: ['Testing'] }
      ];

      // Mock document repository to fail
      jest.spyOn(mockDocRepo, 'createSession').mockRejectedValue(new Error('Document creation failed'));

      // Graph initialization should still succeed
      await expect(knowledgeStore.initializePersonas(personas)).resolves.not.toThrow();

      // But document operations should fail
      await expect(knowledgeStore.documents.createSession({
        sessionId: 'fail-test',
        topic: 'failure',
        startedAt: new Date(),
        participants: ['partial-fail-test'],
        critiques: [],
        metadata: { status: 'active', version: '4.0.0', workflowType: 'sequential' },
        tags: []
      })).rejects.toThrow('Document creation failed');
    });
  });
});