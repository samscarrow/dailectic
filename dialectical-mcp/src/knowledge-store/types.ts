// Knowledge Store Type Definitions
export interface PersonaNode {
  id: string;
  name: string;
  emoji: string;
  role: string;
  coreGoal: string;
  values: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicNode {
  id: string;
  name: string;
  category: string;
  description?: string;
  complexity: number; // 1-10 scale
  createdAt: Date;
}

export interface ConceptNode {
  id: string;
  name: string;
  definition: string;
  category: string;
  createdAt: Date;
}

// Relationship Types
export interface ExpertiseRelation {
  from: string; // persona id
  to: string;   // topic id
  strength: 'novice' | 'intermediate' | 'advanced' | 'expert';
  confidence: number; // 0.0-1.0
  evidence: string[]; // Supporting evidence
  updatedAt: Date;
}

export interface ConflictRelation {
  from: string; // persona id
  to: string;   // persona id
  type: 'philosophical' | 'methodological' | 'priority';
  intensity: number; // 0.0-1.0
  reasoning: string;
  examples: string[];
}

export interface ConceptDependency {
  prerequisite: string; // concept id
  dependent: string;    // concept id
  strength: number; // 0.0-1.0
  reasoning: string;
}

// Document Types
export interface DebateSessionDocument {
  _id?: string;
  sessionId: string;
  topic: string;
  context?: string;
  startedAt: Date;
  completedAt?: Date;
  participants: string[]; // persona ids
  critiques: CritiqueRecord[];
  synthesis?: SynthesisRecord;
  metadata: SessionMetadata;
  tags: string[];
}

export interface CritiqueRecord {
  persona: string;
  content: string;
  timestamp: Date;
  metadata: {
    confidence: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
    tokenCount?: number;
    responseTime?: number; // ms
  };
  structured?: any; // For JSON responses
}

export interface SynthesisRecord {
  content: string;
  reasoning: string;
  timestamp: Date;
  keyInsights: string[];
  conflictsResolved: string[];
  tradeoffs: string[];
  implementationPlan: string[];
  metadata: {
    confidence: number;
    tokenCount?: number;
  };
}

export interface SessionMetadata {
  status: 'active' | 'synthesizing' | 'completed' | 'archived';
  totalTokens?: number;
  version: string;
  workflowType: 'sequential' | 'parallel' | 'targeted' | 'audit';
  priority: 'low' | 'medium' | 'high';
  userId?: string;
}

// Search and Query Types
export interface SearchQuery {
  text?: string;
  filters?: {
    personas?: string[];
    topics?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    status?: SessionMetadata['status'];
    severity?: CritiqueRecord['metadata']['severity'];
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  searchTime: number; // ms
}

// Analytics Types
export interface PersonaInsight {
  personaId: string;
  totalCritiques: number;
  averageConfidence: number;
  expertiseAreas: Array<{
    topic: string;
    strength: number;
  }>;
  commonThemes: string[];
  performanceMetrics: {
    averageResponseTime: number;
    qualityScore: number; // derived metric
  };
}

export interface TopicInsight {
  topicId: string;
  totalDiscussions: number;
  averageComplexity: number;
  expertPersonas: string[];
  commonIssues: string[];
  resolutionPatterns: string[];
}

export interface SystemMetrics {
  totalSessions: number;
  totalCritiques: number;
  averageSessionDuration: number; // minutes
  popularTopics: Array<{
    topic: string;
    count: number;
  }>;
  personaUtilization: Array<{
    persona: string;
    utilizationRate: number; // 0.0-1.0
  }>;
}