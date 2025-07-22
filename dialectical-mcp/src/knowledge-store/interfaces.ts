import {
  PersonaNode,
  TopicNode,
  ConceptNode,
  ExpertiseRelation,
  ConflictRelation,
  ConceptDependency,
  DebateSessionDocument,
  SearchQuery,
  SearchResult,
  PersonaInsight,
  TopicInsight,
  SystemMetrics
} from './types.js';

// Cross-Domain Insights Types (Prometheus's Innovation)
export interface CrossDomainInsight {
  sessionId: string;
  generatedAt: Date;
  computationTime: number; // milliseconds
  dataQuality: {
    graphCompleteness: number; // 0-1
    documentRichness: number; // 0-1
    overallConfidence: number; // 0-1
  };
}

export interface RelatedConcept {
  concept: string;
  relationship: string;
  strength: number; // 0-1
  discoveredThrough: 'graph_traversal' | 'content_analysis' | 'persona_expertise';
  evidencePaths?: string[]; // For graph traversal discoveries
  semanticSimilarity?: number; // For content analysis discoveries
  expertiseOverlap?: number; // For persona expertise discoveries
}

export interface ExpertiseGap {
  topic: string;
  currentCoverage: number; // 0-1
  missingExpertise: string[];
  recommendedLearning: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    estimatedBenefit: number; // 0-1
  }>;
  potentialPersonas?: string[]; // Personas who could develop this expertise
}

export interface ConflictPattern {
  personas: [string, string];
  conflictType: 'philosophical' | 'methodological' | 'priority';
  frequency: number;
  intensityTrend: 'increasing' | 'stable' | 'decreasing';
  commonTriggers: string[];
  resolutionStrategies: Array<{
    strategy: string;
    successRate: number; // 0-1
    typicalOutcome: string;
  }>;
  lastOccurrence: Date;
}

export interface EmergentTheme {
  theme: string;
  sessions: string[];
  firstAppearance: Date;
  evolution: Array<{
    timestamp: Date;
    confidence: number; // 0-1
    context: string;
  }>;
  predictedTrend: 'increasing' | 'stable' | 'decreasing';
  trendConfidence: number; // 0-1
  relatedTopics: string[];
  drivingFactors: string[];
}

export interface InnovationOpportunity {
  opportunity: string;
  category: 'technical' | 'process' | 'conceptual' | 'interdisciplinary';
  evidenceFromSessions: Array<{
    sessionId: string;
    relevantQuotes: string[];
    contributingPersonas: string[];
  }>;
  requiredExpertise: Array<{
    domain: string;
    level: 'basic' | 'intermediate' | 'advanced' | 'expert';
    currentGap: number; // 0-1, how much we're missing
  }>;
  potentialImpact: {
    level: 'low' | 'medium' | 'high';
    areas: string[]; // Which areas would benefit
    timeframe: 'short' | 'medium' | 'long'; // Expected realization time
  };
  implementationComplexity: 'low' | 'medium' | 'high';
  riskFactors: string[];
  nextSteps: string[];
}

// Graph Database Interface
export interface IGraphRepository {
  // Node Operations
  createPersonaNode(persona: Omit<PersonaNode, 'createdAt' | 'updatedAt'>): Promise<PersonaNode>;
  createTopicNode(topic: Omit<TopicNode, 'createdAt'>): Promise<TopicNode>;
  createConceptNode(concept: Omit<ConceptNode, 'createdAt'>): Promise<ConceptNode>;
  
  getPersonaNode(id: string): Promise<PersonaNode | null>;
  getTopicNode(id: string): Promise<TopicNode | null>;
  getConceptNode(id: string): Promise<ConceptNode | null>;
  
  updatePersonaNode(id: string, updates: Partial<PersonaNode>): Promise<PersonaNode>;
  updateTopicNode(id: string, updates: Partial<TopicNode>): Promise<TopicNode>;
  
  deletePersonaNode(id: string): Promise<boolean>;
  deleteTopicNode(id: string): Promise<boolean>;
  deleteConceptNode(id: string): Promise<boolean>;

  // Relationship Operations
  createExpertiseRelation(relation: ExpertiseRelation): Promise<void>;
  createConflictRelation(relation: ConflictRelation): Promise<void>;
  createConceptDependency(dependency: ConceptDependency): Promise<void>;
  
  getPersonaExpertise(personaId: string): Promise<ExpertiseRelation[]>;
  getTopicExperts(topicId: string): Promise<ExpertiseRelation[]>;
  getPersonaConflicts(personaId: string): Promise<ConflictRelation[]>;
  getConceptDependencies(conceptId: string): Promise<ConceptDependency[]>;
  
  updateExpertiseRelation(from: string, to: string, updates: Partial<ExpertiseRelation>): Promise<void>;
  
  deleteExpertiseRelation(from: string, to: string): Promise<boolean>;
  deleteConflictRelation(from: string, to: string): Promise<boolean>;

  // Complex Queries
  recommendPersonasForTopic(topicId: string, limit?: number): Promise<Array<{ persona: PersonaNode; score: number }>>;
  findConflictingPersonas(personaIds: string[]): Promise<ConflictRelation[]>;
  discoverLearningPath(fromConcept: string, toConcept: string): Promise<ConceptNode[]>;
  
  // Analytics
  getPersonaInsights(personaId: string): Promise<PersonaInsight>;
  getTopicInsights(topicId: string): Promise<TopicInsight>;
  getSystemMetrics(): Promise<SystemMetrics>;
}

// Document Database Interface
export interface IDocumentRepository {
  // Session Operations
  createSession(session: Omit<DebateSessionDocument, '_id'>): Promise<DebateSessionDocument>;
  getSession(sessionId: string): Promise<DebateSessionDocument | null>;
  updateSession(sessionId: string, updates: Partial<DebateSessionDocument>): Promise<DebateSessionDocument>;
  deleteSession(sessionId: string): Promise<boolean>;
  
  // Query Operations
  searchSessions(query: SearchQuery): Promise<SearchResult<DebateSessionDocument>>;
  getSessionsByTopic(topic: string, limit?: number): Promise<DebateSessionDocument[]>;
  getSessionsByPersona(personaId: string, limit?: number): Promise<DebateSessionDocument[]>;
  getActiveSessions(): Promise<DebateSessionDocument[]>;
  
  // Content Operations
  addCritiqueToSession(sessionId: string, critique: DebateSessionDocument['critiques'][0]): Promise<void>;
  setSynthesis(sessionId: string, synthesis: DebateSessionDocument['synthesis']): Promise<void>;
  
  // Full-text Search
  searchContent(text: string, filters?: SearchQuery['filters']): Promise<SearchResult<DebateSessionDocument>>;
  
  // Maintenance
  archiveOldSessions(beforeDate: Date): Promise<number>;
  cleanupSessions(criteria: { status?: string; olderThan?: Date }): Promise<number>;
}

// Unified Knowledge Store Interface
export interface IKnowledgeStore {
  // Repository Access
  readonly graph: IGraphRepository;
  readonly documents: IDocumentRepository;
  
  // Unified Operations
  initializePersonas(personas: Omit<PersonaNode, 'createdAt' | 'updatedAt'>[]): Promise<void>;
  learnFromSession(sessionId: string): Promise<void>; // Extract insights and update graph
  
  // Cross-Database Analytics
  getPersonaPerformance(personaId: string): Promise<{
    graphInsights: PersonaInsight;
    sessionHistory: DebateSessionDocument[];
    overallScore: number;
  }>;
  
  // Cross-Domain Insights (Prometheus's Innovation)
  getCrossDomainInsights(sessionId: string): Promise<CrossDomainInsight & {
    relatedConcepts: RelatedConcept[];
    expertiseGaps: ExpertiseGap[];
    conflictPatterns: ConflictPattern[];
    emergentThemes: EmergentTheme[];
    innovationOpportunities: InnovationOpportunity[];
  }>;
  
  // Advanced Analytics
  getGlobalInsights(): Promise<{
    systemWidePatterns: EmergentTheme[];
    expertiseDistribution: Record<string, number>;
    conflictResolutionTrends: ConflictPattern[];
    innovationReadiness: {
      score: number; // 0-1
      factors: string[];
      recommendations: string[];
    };
  }>;
  
  discoverKnowledgeGaps(): Promise<{
    criticalGaps: ExpertiseGap[];
    learningPriorities: Array<{
      topic: string;
      urgency: 'low' | 'medium' | 'high' | 'critical';
      effort: 'low' | 'medium' | 'high';
      impact: 'low' | 'medium' | 'high';
    }>;
    suggestedPersonaDevelopment: Record<string, string[]>;
  }>;
  
  // Health and Monitoring
  healthCheck(): Promise<{
    graph: { connected: boolean; nodeCount: number; relationshipCount: number };
    documents: { connected: boolean; documentCount: number; indexHealth: string };
  }>;
  
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  migrate(version: string): Promise<void>;
}

// Factory Interface
export interface IKnowledgeStoreFactory {
  create(config: KnowledgeStoreConfig): Promise<IKnowledgeStore>;
}

export interface KnowledgeStoreConfig {
  graph: {
    type: 'neo4j' | 'redis-graph' | 'arangodb';
    connection: {
      host: string;
      port: number;
      username?: string;
      password?: string;
      database?: string;
    };
    options?: Record<string, any>;
  };
  
  documents: {
    type: 'mongodb' | 'couchdb' | 'elasticsearch';
    connection: {
      host: string;
      port: number;
      username?: string;
      password?: string;
      database: string;
    };
    options?: Record<string, any>;
  };
  
  // Optional: Search layer configuration
  search?: {
    type: 'elasticsearch' | 'algolia';
    connection: {
      host: string;
      port: number;
      apiKey?: string;
      index: string;
    };
  };
  
  // Security and governance
  security: {
    enablePIIRedaction: boolean;
    enableAuditLogging: boolean;
    requireHumanApproval: boolean;
  };
}