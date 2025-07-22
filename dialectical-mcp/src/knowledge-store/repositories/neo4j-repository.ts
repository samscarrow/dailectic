import neo4j, { Driver, Session, Record } from 'neo4j-driver';
import { IGraphRepository } from '../interfaces.js';
import {
  PersonaNode,
  TopicNode,
  ConceptNode,
  ExpertiseRelation,
  ConflictRelation,
  ConceptDependency,
  PersonaInsight,
  TopicInsight,
  SystemMetrics
} from '../types.js';

export class Neo4jRepository implements IGraphRepository {
  private driver: Driver | null = null;

  constructor(
    private readonly uri: string,
    private readonly username: string,
    private readonly password: string,
    private readonly database = 'neo4j'
  ) {}

  async connect(): Promise<void> {
    this.driver = neo4j.driver(
      this.uri,
      neo4j.auth.basic(this.username, this.password)
    );
    
    // Test connection
    await this.driver.verifyConnectivity();
    console.log('Connected to Neo4j');
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  private getSession(): Session {
    if (!this.driver) {
      throw new Error('Neo4j driver not connected');
    }
    return this.driver.session({ database: this.database });
  }

  // Persona Node Operations
  async createPersonaNode(persona: Omit<PersonaNode, 'createdAt' | 'updatedAt'>): Promise<PersonaNode> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        CREATE (p:Persona {
          id: $id,
          name: $name,
          emoji: $emoji,
          role: $role,
          coreGoal: $coreGoal,
          values: $values,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN p
      `, persona);

      const record = result.records[0];
      return this.recordToPersonaNode(record.get('p'));
    } finally {
      await session.close();
    }
  }

  async getPersonaNode(id: string): Promise<PersonaNode | null> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (p:Persona {id: $id})
        RETURN p
      `, { id });

      if (result.records.length === 0) return null;
      return this.recordToPersonaNode(result.records[0].get('p'));
    } finally {
      await session.close();
    }
  }

  async updatePersonaNode(id: string, updates: Partial<PersonaNode>): Promise<PersonaNode> {
    const session = this.getSession();
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'createdAt')
        .map(key => `p.${key} = $${key}`)
        .join(', ');

      const result = await session.run(`
        MATCH (p:Persona {id: $id})
        SET ${setClause}, p.updatedAt = datetime()
        RETURN p
      `, { id, ...updates });

      return this.recordToPersonaNode(result.records[0].get('p'));
    } finally {
      await session.close();
    }
  }

  async deletePersonaNode(id: string): Promise<boolean> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (p:Persona {id: $id})
        DETACH DELETE p
        RETURN count(p) as deleted
      `, { id });

      return result.records[0].get('deleted').toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  // Topic Node Operations
  async createTopicNode(topic: Omit<TopicNode, 'createdAt'>): Promise<TopicNode> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        CREATE (t:Topic {
          id: $id,
          name: $name,
          category: $category,
          description: $description,
          complexity: $complexity,
          createdAt: datetime()
        })
        RETURN t
      `, topic);

      return this.recordToTopicNode(result.records[0].get('t'));
    } finally {
      await session.close();
    }
  }

  async getTopicNode(id: string): Promise<TopicNode | null> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (t:Topic {id: $id})
        RETURN t
      `, { id });

      if (result.records.length === 0) return null;
      return this.recordToTopicNode(result.records[0].get('t'));
    } finally {
      await session.close();
    }
  }

  async updateTopicNode(id: string, updates: Partial<TopicNode>): Promise<TopicNode> {
    const session = this.getSession();
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'createdAt')
        .map(key => `t.${key} = $${key}`)
        .join(', ');

      const result = await session.run(`
        MATCH (t:Topic {id: $id})
        SET ${setClause}
        RETURN t
      `, { id, ...updates });

      return this.recordToTopicNode(result.records[0].get('t'));
    } finally {
      await session.close();
    }
  }

  async deleteTopicNode(id: string): Promise<boolean> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (t:Topic {id: $id})
        DETACH DELETE t
        RETURN count(t) as deleted
      `, { id });

      return result.records[0].get('deleted').toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  // Concept Node Operations
  async createConceptNode(concept: Omit<ConceptNode, 'createdAt'>): Promise<ConceptNode> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        CREATE (c:Concept {
          id: $id,
          name: $name,
          definition: $definition,
          category: $category,
          createdAt: datetime()
        })
        RETURN c
      `, concept);

      return this.recordToConceptNode(result.records[0].get('c'));
    } finally {
      await session.close();
    }
  }

  async getConceptNode(id: string): Promise<ConceptNode | null> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (c:Concept {id: $id})
        RETURN c
      `, { id });

      if (result.records.length === 0) return null;
      return this.recordToConceptNode(result.records[0].get('c'));
    } finally {
      await session.close();
    }
  }

  async deleteConceptNode(id: string): Promise<boolean> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (c:Concept {id: $id})
        DETACH DELETE c
        RETURN count(c) as deleted
      `, { id });

      return result.records[0].get('deleted').toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  // Relationship Operations
  async createExpertiseRelation(relation: ExpertiseRelation): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(`
        MATCH (p:Persona {id: $from})
        MATCH (t:Topic {id: $to})
        CREATE (p)-[:EXPERTISE {
          strength: $strength,
          confidence: $confidence,
          evidence: $evidence,
          updatedAt: datetime()
        }]->(t)
      `, relation);
    } finally {
      await session.close();
    }
  }

  async createConflictRelation(relation: ConflictRelation): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(`
        MATCH (p1:Persona {id: $from})
        MATCH (p2:Persona {id: $to})
        CREATE (p1)-[:CONFLICTS_WITH {
          type: $type,
          intensity: $intensity,
          reasoning: $reasoning,
          examples: $examples
        }]->(p2)
      `, relation);
    } finally {
      await session.close();
    }
  }

  async createConceptDependency(dependency: ConceptDependency): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(`
        MATCH (c1:Concept {id: $prerequisite})
        MATCH (c2:Concept {id: $dependent})
        CREATE (c1)-[:PREREQUISITE_FOR {
          strength: $strength,
          reasoning: $reasoning
        }]->(c2)
      `, dependency);
    } finally {
      await session.close();
    }
  }

  async getPersonaExpertise(personaId: string): Promise<ExpertiseRelation[]> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (p:Persona {id: $personaId})-[e:EXPERTISE]->(t:Topic)
        RETURN e, t.id as topicId
      `, { personaId });

      return result.records.map(record => ({
        from: personaId,
        to: record.get('topicId'),
        strength: record.get('e').properties.strength,
        confidence: record.get('e').properties.confidence,
        evidence: record.get('e').properties.evidence,
        updatedAt: record.get('e').properties.updatedAt.toStandardDate()
      }));
    } finally {
      await session.close();
    }
  }

  async getTopicExperts(topicId: string): Promise<ExpertiseRelation[]> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (p:Persona)-[e:EXPERTISE]->(t:Topic {id: $topicId})
        RETURN e, p.id as personaId
        ORDER BY e.confidence DESC
      `, { topicId });

      return result.records.map(record => ({
        from: record.get('personaId'),
        to: topicId,
        strength: record.get('e').properties.strength,
        confidence: record.get('e').properties.confidence,
        evidence: record.get('e').properties.evidence,
        updatedAt: record.get('e').properties.updatedAt.toStandardDate()
      }));
    } finally {
      await session.close();
    }
  }

  async getPersonaConflicts(personaId: string): Promise<ConflictRelation[]> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (p1:Persona {id: $personaId})-[c:CONFLICTS_WITH]->(p2:Persona)
        RETURN c, p2.id as targetPersona
      `, { personaId });

      return result.records.map(record => ({
        from: personaId,
        to: record.get('targetPersona'),
        type: record.get('c').properties.type,
        intensity: record.get('c').properties.intensity,
        reasoning: record.get('c').properties.reasoning,
        examples: record.get('c').properties.examples
      }));
    } finally {
      await session.close();
    }
  }

  async getConceptDependencies(conceptId: string): Promise<ConceptDependency[]> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (c1:Concept {id: $conceptId})-[p:PREREQUISITE_FOR]->(c2:Concept)
        RETURN p, c2.id as dependentId
      `, { conceptId });

      return result.records.map(record => ({
        prerequisite: conceptId,
        dependent: record.get('dependentId'),
        strength: record.get('p').properties.strength,
        reasoning: record.get('p').properties.reasoning
      }));
    } finally {
      await session.close();
    }
  }

  async updateExpertiseRelation(from: string, to: string, updates: Partial<ExpertiseRelation>): Promise<void> {
    const session = this.getSession();
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'from' && key !== 'to')
        .map(key => `e.${key} = $${key}`)
        .join(', ');

      await session.run(`
        MATCH (p:Persona {id: $from})-[e:EXPERTISE]->(t:Topic {id: $to})
        SET ${setClause}, e.updatedAt = datetime()
      `, { from, to, ...updates });
    } finally {
      await session.close();
    }
  }

  async deleteExpertiseRelation(from: string, to: string): Promise<boolean> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (p:Persona {id: $from})-[e:EXPERTISE]->(t:Topic {id: $to})
        DELETE e
        RETURN count(e) as deleted
      `, { from, to });

      return result.records[0].get('deleted').toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  async deleteConflictRelation(from: string, to: string): Promise<boolean> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (p1:Persona {id: $from})-[c:CONFLICTS_WITH]->(p2:Persona {id: $to})
        DELETE c
        RETURN count(c) as deleted
      `, { from, to });

      return result.records[0].get('deleted').toNumber() > 0;
    } finally {
      await session.close();
    }
  }

  // Complex Queries
  async recommendPersonasForTopic(topicId: string, limit = 5): Promise<Array<{ persona: PersonaNode; score: number }>> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (p:Persona)-[e:EXPERTISE]->(t:Topic {id: $topicId})
        WITH p, e.confidence * 
             CASE e.strength 
               WHEN 'expert' THEN 4 
               WHEN 'advanced' THEN 3 
               WHEN 'intermediate' THEN 2 
               ELSE 1 END as score
        ORDER BY score DESC
        LIMIT $limit
        RETURN p, score
      `, { topicId, limit });

      return result.records.map(record => ({
        persona: this.recordToPersonaNode(record.get('p')),
        score: record.get('score')
      }));
    } finally {
      await session.close();
    }
  }

  async findConflictingPersonas(personaIds: string[]): Promise<ConflictRelation[]> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (p1:Persona)-[c:CONFLICTS_WITH]->(p2:Persona)
        WHERE p1.id IN $personaIds AND p2.id IN $personaIds
        RETURN c, p1.id as from, p2.id as to
      `, { personaIds });

      return result.records.map(record => ({
        from: record.get('from'),
        to: record.get('to'),
        type: record.get('c').properties.type,
        intensity: record.get('c').properties.intensity,
        reasoning: record.get('c').properties.reasoning,
        examples: record.get('c').properties.examples
      }));
    } finally {
      await session.close();
    }
  }

  async discoverLearningPath(fromConcept: string, toConcept: string): Promise<ConceptNode[]> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH path = shortestPath((from:Concept {id: $fromConcept})-[:PREREQUISITE_FOR*]->(to:Concept {id: $toConcept}))
        RETURN nodes(path) as concepts
      `, { fromConcept, toConcept });

      if (result.records.length === 0) return [];
      
      const concepts = result.records[0].get('concepts');
      return concepts.map((concept: any) => this.recordToConceptNode(concept));
    } finally {
      await session.close();
    }
  }

  // Analytics
  async getPersonaInsights(personaId: string): Promise<PersonaInsight> {
    // Placeholder implementation - would need to integrate with document store for full insights
    return {
      personaId,
      totalCritiques: 0,
      averageConfidence: 0,
      expertiseAreas: [],
      commonThemes: [],
      performanceMetrics: {
        averageResponseTime: 0,
        qualityScore: 0
      }
    };
  }

  async getTopicInsights(topicId: string): Promise<TopicInsight> {
    // Placeholder implementation
    return {
      topicId,
      totalDiscussions: 0,
      averageComplexity: 0,
      expertPersonas: [],
      commonIssues: [],
      resolutionPatterns: []
    };
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const session = this.getSession();
    try {
      const result = await session.run(`
        MATCH (p:Persona) WITH count(p) as personaCount
        MATCH (t:Topic) WITH personaCount, count(t) as topicCount
        MATCH (c:Concept) 
        RETURN personaCount, topicCount, count(c) as conceptCount
      `);

      const record = result.records[0];
      return {
        totalSessions: 0, // Would come from document store
        totalCritiques: 0, // Would come from document store
        averageSessionDuration: 0, // Would come from document store
        popularTopics: [],
        personaUtilization: []
      };
    } finally {
      await session.close();
    }
  }

  // Helper methods to convert Neo4j records to typed objects
  private recordToPersonaNode(record: any): PersonaNode {
    const props = record.properties;
    return {
      id: props.id,
      name: props.name,
      emoji: props.emoji,
      role: props.role,
      coreGoal: props.coreGoal,
      values: props.values,
      createdAt: props.createdAt.toStandardDate(),
      updatedAt: props.updatedAt.toStandardDate()
    };
  }

  private recordToTopicNode(record: any): TopicNode {
    const props = record.properties;
    return {
      id: props.id,
      name: props.name,
      category: props.category,
      description: props.description,
      complexity: props.complexity,
      createdAt: props.createdAt.toStandardDate()
    };
  }

  private recordToConceptNode(record: any): ConceptNode {
    const props = record.properties;
    return {
      id: props.id,
      name: props.name,
      definition: props.definition,
      category: props.category,
      createdAt: props.createdAt.toStandardDate()
    };
  }
}