import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { IDocumentRepository } from '../interfaces.js';
import {
  DebateSessionDocument,
  SearchQuery,
  SearchResult
} from '../types.js';

export class MongoDbRepository implements IDocumentRepository {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private sessions: Collection<DebateSessionDocument> | null = null;

  constructor(
    private readonly uri: string,
    private readonly databaseName: string
  ) {}

  async connect(): Promise<void> {
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    
    this.db = this.client.db(this.databaseName);
    this.sessions = this.db.collection<DebateSessionDocument>('sessions');
    
    // Create indexes for better performance
    await this.createIndexes();
    
    console.log('Connected to MongoDB');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.sessions = null;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.sessions) return;

    await Promise.all([
      // Single field indexes
      this.sessions.createIndex({ sessionId: 1 }, { unique: true }),
      this.sessions.createIndex({ topic: 1 }),
      this.sessions.createIndex({ 'metadata.status': 1 }),
      this.sessions.createIndex({ startedAt: -1 }),
      this.sessions.createIndex({ participants: 1 }),
      this.sessions.createIndex({ tags: 1 }),
      
      // Compound indexes for common queries
      this.sessions.createIndex({ topic: 1, 'metadata.status': 1 }),
      this.sessions.createIndex({ participants: 1, startedAt: -1 }),
      this.sessions.createIndex({ 'metadata.status': 1, startedAt: -1 }),
      
      // Text index for full-text search
      this.sessions.createIndex({
        topic: 'text',
        'critiques.content': 'text',
        'synthesis.content': 'text',
        tags: 'text'
      }, {
        name: 'content_text_index',
        weights: {
          topic: 10,
          'synthesis.content': 8,
          'critiques.content': 5,
          tags: 3
        }
      })
    ]);
  }

  private getCollection(): Collection<DebateSessionDocument> {
    if (!this.sessions) {
      throw new Error('MongoDB not connected');
    }
    return this.sessions;
  }

  // Session Operations
  async createSession(session: Omit<DebateSessionDocument, '_id'>): Promise<DebateSessionDocument> {
    const collection = this.getCollection();
    
    const result = await collection.insertOne({
      ...session,
      _id: new ObjectId().toString()
    } as DebateSessionDocument);
    
    const created = await collection.findOne({ _id: result.insertedId });
    if (!created) {
      throw new Error('Failed to create session');
    }
    
    return created;
  }

  async getSession(sessionId: string): Promise<DebateSessionDocument | null> {
    const collection = this.getCollection();
    return await collection.findOne({ sessionId });
  }

  async updateSession(sessionId: string, updates: Partial<DebateSessionDocument>): Promise<DebateSessionDocument> {
    const collection = this.getCollection();
    
    const result = await collection.findOneAndUpdate(
      { sessionId },
      { 
        $set: {
          ...updates,
          // Don't allow updating these fields
          sessionId: undefined,
          _id: undefined
        }
      },
      { returnDocument: 'after' }
    );
    
    if (!result.value) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    return result.value;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const collection = this.getCollection();
    
    const result = await collection.deleteOne({ sessionId });
    return result.deletedCount > 0;
  }

  // Query Operations
  async searchSessions(query: SearchQuery): Promise<SearchResult<DebateSessionDocument>> {
    const collection = this.getCollection();
    const startTime = Date.now();
    
    // Build MongoDB query
    const filter: any = {};
    
    if (query.filters) {
      if (query.filters.personas?.length) {
        filter.participants = { $in: query.filters.personas };
      }
      
      if (query.filters.topics?.length) {
        filter.$or = query.filters.topics.map(topic => ({
          $or: [
            { topic: { $regex: topic, $options: 'i' } },
            { tags: { $in: [topic] } }
          ]
        }));
      }
      
      if (query.filters.dateRange) {
        filter.startedAt = {
          $gte: query.filters.dateRange.start,
          $lte: query.filters.dateRange.end
        };
      }
      
      if (query.filters.status) {
        filter['metadata.status'] = query.filters.status;
      }
      
      if (query.filters.severity) {
        filter['critiques.metadata.severity'] = query.filters.severity;
      }
    }
    
    // Handle text search
    if (query.text) {
      filter.$text = { $search: query.text };
    }
    
    // Build sort
    let sort: any = { startedAt: -1 }; // Default sort
    if (query.sort) {
      sort = { [query.sort.field]: query.sort.direction === 'asc' ? 1 : -1 };
    } else if (query.text) {
      sort = { score: { $meta: 'textScore' } };
    }
    
    // Execute query with pagination
    const limit = query.limit || 20;
    const skip = query.offset || 0;
    
    const [items, totalCount] = await Promise.all([
      collection
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter)
    ]);
    
    const searchTime = Date.now() - startTime;
    
    return {
      items,
      totalCount,
      hasMore: skip + items.length < totalCount,
      searchTime
    };
  }

  async getSessionsByTopic(topic: string, limit = 20): Promise<DebateSessionDocument[]> {
    const collection = this.getCollection();
    
    return await collection
      .find({
        $or: [
          { topic: { $regex: topic, $options: 'i' } },
          { tags: { $in: [topic] } }
        ]
      })
      .sort({ startedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async getSessionsByPersona(personaId: string, limit = 20): Promise<DebateSessionDocument[]> {
    const collection = this.getCollection();
    
    return await collection
      .find({ participants: personaId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async getActiveSessions(): Promise<DebateSessionDocument[]> {
    const collection = this.getCollection();
    
    return await collection
      .find({ 'metadata.status': 'active' })
      .sort({ startedAt: -1 })
      .toArray();
  }

  // Content Operations
  async addCritiqueToSession(sessionId: string, critique: DebateSessionDocument['critiques'][0]): Promise<void> {
    const collection = this.getCollection();
    
    await collection.updateOne(
      { sessionId },
      {
        $push: { critiques: critique },
        $addToSet: { participants: critique.persona }
      }
    );
  }

  async setSynthesis(sessionId: string, synthesis: DebateSessionDocument['synthesis']): Promise<void> {
    const collection = this.getCollection();
    
    await collection.updateOne(
      { sessionId },
      {
        $set: {
          synthesis,
          'metadata.status': 'completed',
          completedAt: new Date()
        }
      }
    );
  }

  // Full-text Search
  async searchContent(text: string, filters?: SearchQuery['filters']): Promise<SearchResult<DebateSessionDocument>> {
    return await this.searchSessions({ text, filters });
  }

  // Maintenance Operations
  async archiveOldSessions(beforeDate: Date): Promise<number> {
    const collection = this.getCollection();
    
    const result = await collection.updateMany(
      {
        startedAt: { $lt: beforeDate },
        'metadata.status': { $ne: 'archived' }
      },
      {
        $set: { 'metadata.status': 'archived' }
      }
    );
    
    return result.modifiedCount;
  }

  async cleanupSessions(criteria: { status?: string; olderThan?: Date }): Promise<number> {
    const collection = this.getCollection();
    
    const filter: any = {};
    
    if (criteria.status) {
      filter['metadata.status'] = criteria.status;
    }
    
    if (criteria.olderThan) {
      filter.startedAt = { $lt: criteria.olderThan };
    }
    
    const result = await collection.deleteMany(filter);
    return result.deletedCount;
  }

  // Analytics queries
  async getSessionAnalytics(): Promise<{
    totalSessions: number;
    sessionsByStatus: Record<string, number>;
    sessionsByPersona: Record<string, number>;
    averageSessionDuration: number;
    topTopics: Array<{ topic: string; count: number }>;
  }> {
    const collection = this.getCollection();
    
    const [
      totalSessions,
      statusBreakdown,
      personaBreakdown,
      durationStats,
      topicStats
    ] = await Promise.all([
      // Total sessions
      collection.countDocuments({}),
      
      // Sessions by status
      collection.aggregate([
        { $group: { _id: '$metadata.status', count: { $sum: 1 } } }
      ]).toArray(),
      
      // Sessions by persona
      collection.aggregate([
        { $unwind: '$participants' },
        { $group: { _id: '$participants', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray(),
      
      // Average session duration
      collection.aggregate([
        { $match: { completedAt: { $exists: true } } },
        {
          $project: {
            duration: {
              $divide: [
                { $subtract: ['$completedAt', '$startedAt'] },
                1000 * 60 // Convert to minutes
              ]
            }
          }
        },
        { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
      ]).toArray(),
      
      // Top topics
      collection.aggregate([
        { $group: { _id: '$topic', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray()
    ]);
    
    return {
      totalSessions,
      sessionsByStatus: Object.fromEntries(
        statusBreakdown.map((item: any) => [item._id, item.count])
      ),
      sessionsByPersona: Object.fromEntries(
        personaBreakdown.map((item: any) => [item._id, item.count])
      ),
      averageSessionDuration: durationStats[0]?.avgDuration || 0,
      topTopics: topicStats.map((item: any) => ({
        topic: item._id,
        count: item.count
      }))
    };
  }

  // Health check
  async healthCheck(): Promise<{
    connected: boolean;
    documentCount: number;
    indexHealth: string;
  }> {
    try {
      if (!this.db) {
        return {
          connected: false,
          documentCount: 0,
          indexHealth: 'disconnected'
        };
      }
      
      const collection = this.getCollection();
      const [documentCount, indexes] = await Promise.all([
        collection.countDocuments({}),
        collection.listIndexes().toArray()
      ]);
      
      const indexHealth = indexes.length > 1 ? 'healthy' : 'missing_indexes';
      
      return {
        connected: true,
        documentCount,
        indexHealth
      };
    } catch (error) {
      return {
        connected: false,
        documentCount: 0,
        indexHealth: 'error'
      };
    }
  }
}