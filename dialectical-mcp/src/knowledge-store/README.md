# Knowledge Store Module

The Knowledge Store module provides a unified interface for managing persona relationships, topic expertise, and debate session history across graph and document databases. This is the persistent memory system for the Dialectical Engine v4.0.

## Quick Start

```typescript
import { createKnowledgeStoreFactory } from './knowledge-store/index.js';
import { ALL_PERSONAS } from './personas/definitions.js';

// Configure the knowledge store
const config = {
  graph: {
    type: 'neo4j',
    connection: {
      host: 'localhost',
      port: 7687,
      username: 'neo4j',
      password: 'password',
      database: 'dialectical'
    }
  },
  documents: {
    type: 'mongodb',
    connection: {
      host: 'localhost',
      port: 27017,
      database: 'dialectical'
    }
  },
  security: {
    enablePIIRedaction: true,
    enableAuditLogging: true,
    requireHumanApproval: false
  }
};

// Create and initialize the knowledge store
const factory = createKnowledgeStoreFactory();
const knowledgeStore = await factory.create(config);

// Initialize personas
await knowledgeStore.initializePersonas(Object.values(ALL_PERSONAS));

// Ready to use!
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│           KnowledgeStore                │
│  (Unified Service Abstraction)         │
└─────────────┬───────────────────────────┘
              │
     ┌────────┴────────┐
     │                 │
┌────▼─────┐     ┌─────▼──────┐
│   Graph  │     │  Document  │
│Repository│     │ Repository │
│          │     │            │
│ Neo4j    │     │ MongoDB    │
│ ArangoDB │     │ CouchDB    │
│ Redis    │     │ Elastic    │
└──────────┘     └────────────┘
```

### Graph Database (Relationships & Expertise)
- **Personas**: AI personality nodes with goals, values, biases
- **Topics**: Subject matter domains
- **Concepts**: Abstract ideas and their dependencies
- **Relationships**: Expertise levels, philosophical conflicts, learning paths

### Document Database (Sessions & Content)
- **Debate Sessions**: Complete conversation transcripts
- **Critiques**: Individual persona responses with metadata
- **Synthesis**: Final reasoning and decisions
- **Analytics**: Performance metrics and insights

## Core Interfaces

### IKnowledgeStore
The main service interface providing unified access to both databases.

```typescript
interface IKnowledgeStore {
  readonly graph: IGraphRepository;
  readonly documents: IDocumentRepository;
  
  initializePersonas(personas: PersonaData[]): Promise<void>;
  learnFromSession(sessionId: string): Promise<void>;
  getPersonaPerformance(personaId: string): Promise<PerformanceData>;
  healthCheck(): Promise<HealthStatus>;
}
```

### IGraphRepository
Interface for relationship and expertise data.

```typescript
interface IGraphRepository {
  // Node Operations
  createPersonaNode(persona: PersonaNode): Promise<PersonaNode>;
  createTopicNode(topic: TopicNode): Promise<TopicNode>;
  
  // Relationship Operations
  createExpertiseRelation(relation: ExpertiseRelation): Promise<void>;
  createConflictRelation(relation: ConflictRelation): Promise<void>;
  
  // Complex Queries
  recommendPersonasForTopic(topicId: string): Promise<Recommendation[]>;
  findConflictingPersonas(personaIds: string[]): Promise<Conflict[]>;
}
```

### IDocumentRepository
Interface for session and content data.

```typescript
interface IDocumentRepository {
  // Session Operations
  createSession(session: DebateSession): Promise<DebateSession>;
  getSession(sessionId: string): Promise<DebateSession | null>;
  
  // Search Operations
  searchSessions(query: SearchQuery): Promise<SearchResult>;
  searchContent(text: string): Promise<SearchResult>;
  
  // Analytics
  getSessionAnalytics(): Promise<Analytics>;
}
```

## Data Models

### PersonaNode
```typescript
interface PersonaNode {
  id: string;              // 'helios', 'selene', etc.
  name: string;            // 'Helios', 'Selene'
  emoji: string;           // '🧑‍💻', '🏛️'
  role: string;            // 'The Pragmatist'
  coreGoal: string;        // 'Ship working code quickly'
  values: string[];        // ['Simplicity', 'Velocity']
  createdAt: Date;
  updatedAt: Date;
}
```

### ExpertiseRelation
```typescript
interface ExpertiseRelation {
  from: string;            // persona id
  to: string;              // topic id
  strength: 'novice' | 'intermediate' | 'advanced' | 'expert';
  confidence: number;      // 0.0-1.0
  evidence: string[];      // Supporting evidence
  updatedAt: Date;
}
```

### DebateSessionDocument
```typescript
interface DebateSessionDocument {
  sessionId: string;
  topic: string;
  startedAt: Date;
  participants: string[];  // persona ids
  critiques: CritiqueRecord[];
  synthesis?: SynthesisRecord;
  metadata: SessionMetadata;
  tags: string[];
}
```

## Usage Examples

### Initialize Knowledge Store
```typescript
// Start with persona initialization
const personas = Object.values(ALL_PERSONAS);
await knowledgeStore.initializePersonas(personas);

// Verify initialization
const helios = await knowledgeStore.graph.getPersonaNode('helios');
console.log(`Initialized ${helios.name} with goal: ${helios.coreGoal}`);
```

### Create and Track a Debate Session
```typescript
// Create new session
const session = await knowledgeStore.documents.createSession({
  sessionId: 'debate-001',
  topic: 'microservices architecture',
  startedAt: new Date(),
  participants: ['helios', 'selene', 'cassandra'],
  critiques: [],
  metadata: {
    status: 'active',
    version: '4.0.0',
    workflowType: 'sequential'
  },
  tags: ['architecture', 'scalability']
});

// Add critiques as they come in
await knowledgeStore.documents.addCritiqueToSession('debate-001', {
  persona: 'helios',
  content: 'Let\'s start simple with a monolith and refactor later',
  timestamp: new Date(),
  metadata: {
    confidence: 0.8,
    tags: ['pragmatic', 'iterative']
  }
});

// Complete with synthesis
await knowledgeStore.documents.setSynthesis('debate-001', {
  content: 'Begin with modular monolith, extract services as needed',
  reasoning: 'Balances Helios\'s pragmatism with Selene\'s architectural vision',
  timestamp: new Date(),
  keyInsights: ['Start simple', 'Extract when proven'],
  conflictsResolved: ['Complexity vs Speed'],
  tradeoffs: ['Initial complexity for future flexibility']
});

// Learn from the completed session
await knowledgeStore.learnFromSession('debate-001');
```

### Find Expert Personas for a Topic
```typescript
// Create a topic first
await knowledgeStore.graph.createTopicNode({
  id: 'security',
  name: 'Security & Risk Management',
  category: 'technical',
  complexity: 8
});

// Get persona recommendations
const experts = await knowledgeStore.graph.recommendPersonasForTopic('security', 3);

experts.forEach(({ persona, score }) => {
  console.log(`${persona.emoji} ${persona.name}: ${(score * 100).toFixed(1)}% match`);
});

// Output:
// 🕵️ Cassandra: 92.0% match
// 🏛️ Selene: 73.5% match  
// 🧑‍💻 Helios: 45.2% match
```

### Search and Analytics
```typescript
// Search sessions by content
const searchResults = await knowledgeStore.documents.searchContent('security vulnerability');

console.log(`Found ${searchResults.totalCount} sessions discussing security vulnerabilities`);

// Get persona performance analytics
const performance = await knowledgeStore.getPersonaPerformance('cassandra');

console.log(`Cassandra's Performance:
  Total Critiques: ${performance.graphInsights.totalCritiques}
  Average Confidence: ${(performance.graphInsights.averageConfidence * 100).toFixed(1)}%
  Overall Score: ${(performance.overallScore * 100).toFixed(1)}%
  Expertise Areas: ${performance.graphInsights.expertiseAreas.map(a => a.topic).join(', ')}
`);
```

### Monitor System Health
```typescript
// Check system health
const health = await knowledgeStore.healthCheck();

console.log(`Knowledge Store Health:
  Graph DB: ${health.graph.connected ? '✅' : '❌'} (${health.graph.nodeCount} nodes)
  Document DB: ${health.documents.connected ? '✅' : '❌'} (${health.documents.documentCount} docs)
  Index Health: ${health.documents.indexHealth}
`);
```

## Database Setup

### Neo4j Setup (Graph Database)
```bash
# Install Neo4j Community Edition
brew install neo4j

# Start Neo4j
neo4j start

# Access browser interface
open http://localhost:7474

# Default credentials: neo4j/neo4j (change on first login)
```

### MongoDB Setup (Document Database)
```bash
# Install MongoDB
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Access MongoDB shell
mongosh

# Create database and user
use dialectical
db.createUser({
  user: "dialectical_user",
  pwd: "password",
  roles: ["readWrite"]
})
```

## Configuration Options

### Graph Database Options
- **neo4j**: Production-ready, rich query language (Cypher)
- **redis-graph**: High-performance, in-memory
- **arangodb**: Multi-model, AQL query language

### Document Database Options  
- **mongodb**: Full-featured, aggregation pipeline
- **couchdb**: Offline-first, conflict resolution
- **elasticsearch**: Advanced search, analytics

### Production Considerations
```typescript
const productionConfig = {
  graph: {
    type: 'neo4j',
    connection: {
      host: 'your-neo4j-aura-url.databases.neo4j.io',
      port: 7687,
      username: 'neo4j',
      password: process.env.NEO4J_PASSWORD,
      database: 'neo4j'
    },
    options: {
      maxConnectionPoolSize: 50,
      connectionTimeout: 30000,
      encrypted: true
    }
  },
  documents: {
    type: 'mongodb',
    connection: {
      host: 'your-mongodb-atlas-cluster.mongodb.net',
      port: 27017,
      username: process.env.MONGODB_USERNAME,
      password: process.env.MONGODB_PASSWORD,
      database: 'dialectical'
    },
    options: {
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    }
  },
  security: {
    enablePIIRedaction: true,
    enableAuditLogging: true,
    requireHumanApproval: true
  }
};
```

## Performance Tips

### Graph Database Optimization
- **Index frequent queries**: Add indexes on persona IDs, topic categories
- **Use query profiling**: Monitor Cypher query performance with `PROFILE`
- **Batch operations**: Use transactions for multiple related operations
- **Connection pooling**: Configure appropriate pool sizes for your load

### Document Database Optimization
- **Compound indexes**: Create indexes on query combinations (topic + status)
- **Text search indexes**: Enable full-text search on critique content
- **Aggregation optimization**: Use `$match` early to filter documents
- **Shard appropriately**: Distribute data based on access patterns

### Caching Strategy
```typescript
// Example with Redis cache layer
const cachedKnowledgeStore = new CachedKnowledgeStore(knowledgeStore, {
  redis: {
    host: 'localhost',
    port: 6379
  },
  ttl: {
    personas: 3600,      // 1 hour
    sessions: 1800,      // 30 minutes
    analytics: 300       // 5 minutes
  }
});
```

## Testing

### Run Tests
```bash
# Run all knowledge store tests
npm test -- --testPathPattern=knowledge-store

# Run specific test file
npm test tests/knowledge-store/knowledge-store.test.ts

# Run with coverage
npm run test:coverage
```

### Mock Data for Testing
```typescript
// Use test factories
import { createMockPersona, createMockSession } from './test-utils';

const testPersona = createMockPersona('test-persona', {
  name: 'Test Helper',
  role: 'Testing Assistant'
});

const testSession = createMockSession('test-session', {
  topic: 'testing patterns',
  participants: ['test-persona']
});
```

## Troubleshooting

### Common Issues

**Connection Timeouts**
```
Error: Connection timeout to Neo4j
```
- Check database server is running
- Verify connection credentials
- Increase timeout values in configuration

**Memory Issues with Large Sessions**
```
Error: Document too large for MongoDB
```
- Implement session pagination
- Archive old sessions regularly
- Use GridFS for large content

**Slow Query Performance**
```
Query took 5000ms to execute
```
- Add appropriate indexes
- Use query profiling tools
- Consider query optimization

### Debug Mode
```typescript
const knowledgeStore = await factory.create({
  ...config,
  debug: true,
  logging: {
    level: 'debug',
    queries: true,
    performance: true
  }
});
```

## Migration Guide

### From v3.0 SessionManager
```typescript
// Old: In-memory session manager
const sessionManager = new SessionManager();
const session = sessionManager.createSession('topic', 'context');

// New: Persistent knowledge store
const session = await knowledgeStore.documents.createSession({
  sessionId: 'topic-' + Date.now(),
  topic: 'topic',
  context: 'context',
  startedAt: new Date(),
  participants: [],
  critiques: [],
  metadata: {
    status: 'active',
    version: '4.0.0',
    workflowType: 'sequential'
  },
  tags: []
});
```

### Data Migration Script
```bash
# Run migration from v3 to v4
npm run migrate -- --from=3.0.0 --to=4.0.0

# Verify migration
npm run migrate:verify
```

## API Reference

Complete API documentation is available in the TypeScript definitions:
- [`interfaces.ts`](./interfaces.ts) - All service interfaces
- [`types.ts`](./types.ts) - Data type definitions
- [`knowledge-store.ts`](./knowledge-store.ts) - Main service implementation

## Contributing

When adding new features to the Knowledge Store:

1. **Define interfaces first** in `interfaces.ts`
2. **Add type definitions** in `types.ts`  
3. **Implement in service layer** 
4. **Write comprehensive tests**
5. **Update documentation**

Example workflow:
```typescript
// 1. Add to interface
interface IKnowledgeStore {
  getTopicTrends(timeRange: TimeRange): Promise<TopicTrend[]>;
}

// 2. Define types
interface TopicTrend {
  topic: string;
  mentions: number;
  sentiment: number;
  growth: number;
}

// 3. Implement
async getTopicTrends(timeRange: TimeRange): Promise<TopicTrend[]> {
  // Implementation here
}

// 4. Test
test('should return topic trends', async () => {
  const trends = await knowledgeStore.getTopicTrends({ days: 30 });
  expect(trends).toBeDefined();
});
```

This ensures the Knowledge Store remains well-architected and maintainable as it grows.