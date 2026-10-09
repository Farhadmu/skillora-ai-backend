import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { randomUUID } from 'node:crypto';
import { AiService } from './ai.service';

export interface DocumentChunk {
  id: string;
  source: string;
  topic: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  trustLevel: 'VERIFIED' | 'COMMUNITY' | 'OFFICIAL';
  content: string;
  embedding?: number[];
  metadata: {
    author?: string;
    version?: string;
    lastUpdated?: string;
    url?: string;
  };
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  score: number;
  method: 'QDRANT_VECTOR' | 'KEYWORD_CATALOG';
}

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private qdrantClient: QdrantClient | null = null;
  private isQdrantOnline = false;
  private readonly collectionName = 'skillora_knowledge';
  private readonly vectorDimension = 768;
  private knowledgeBase: DocumentChunk[] = [];

  constructor(private readonly aiService: AiService) {
    this.seedDefaultKnowledgeBase();
  }

  async onModuleInit() {
    await this.initQdrant();
  }

  /**
   * Initialize connection to Qdrant Vector Engine and ensure collection exists
   */
  async initQdrant() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    const apiKey = process.env.QDRANT_API_KEY;

    try {
      this.qdrantClient = new QdrantClient({
        url: qdrantUrl,
        apiKey: apiKey || undefined,
        checkCompatibility: false,
      });

      // Probe Qdrant connectivity
      await this.qdrantClient.getCollections();
      this.isQdrantOnline = true;
      this.logger.log(`Qdrant Vector Database reachable at ${qdrantUrl}`);

      // Ensure target collection exists with 768-dim Cosine configuration
      await this.ensureCollection();
    } catch (err: any) {
      this.isQdrantOnline = false;
      this.logger.warn(
        `Qdrant Vector Database offline at ${qdrantUrl}: ${err.message}. Operating in verified local catalog fallback mode.`,
      );
    }
  }

  /**
   * Ensure collection exists in Qdrant with 768 dimensions and Cosine distance
   */
  private async ensureCollection() {
    if (!this.qdrantClient || !this.isQdrantOnline) return;

    try {
      const existsRes = await this.qdrantClient.collectionExists(this.collectionName);
      if (!existsRes.exists) {
        await this.qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorDimension,
            distance: 'Cosine',
          },
        });
        this.logger.log(
          `Created Qdrant collection "${this.collectionName}" (dimension: ${this.vectorDimension}, metric: Cosine)`,
        );
        // Sync default baseline catalog chunks into Qdrant
        await this.syncKnowledgeBaseToQdrant();
      } else {
        this.logger.log(`Qdrant collection "${this.collectionName}" already exists.`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to verify or create Qdrant collection: ${err.message}`);
    }
  }

  /**
   * Sync catalog chunks to Qdrant vector collection
   */
  async syncKnowledgeBaseToQdrant() {
    if (!this.qdrantClient || !this.isQdrantOnline) return;

    try {
      const points = [];
      for (const chunk of this.knowledgeBase) {
        const vector = await this.getEmbedding(`${chunk.topic} ${chunk.content}`);
        points.push({
          id: randomUUID(),
          vector,
          payload: {
            chunkId: chunk.id,
            source: chunk.source,
            topic: chunk.topic,
            difficulty: chunk.difficulty,
            trustLevel: chunk.trustLevel,
            content: chunk.content,
            metadata: chunk.metadata,
          },
        });
      }

      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points,
      });

      this.logger.log(`Indexed ${points.length} knowledge chunks into Qdrant collection "${this.collectionName}".`);
    } catch (err: any) {
      this.logger.warn(`Failed to sync knowledge chunks to Qdrant: ${err.message}`);
    }
  }

  /**
   * Generates a 768-dimensional dense vector embedding:
   * Uses Gemini text-embedding-004 if configured, otherwise deterministic normalized 768-dim projection
   */
  async getEmbedding(text: string): Promise<number[]> {
    const aiEmbedding = await this.aiService.generateEmbedding(text);
    if (aiEmbedding && aiEmbedding.length === this.vectorDimension) {
      return aiEmbedding;
    }
    return this.generateDeterministicEmbedding(text);
  }

  /**
   * Deterministic 768-dimensional normalized unit vector projection.
   * Guarantees non-zero cosine similarity for identical/overlapping text in offline/test environments.
   */
  generateDeterministicEmbedding(text: string): number[] {
    const dim = this.vectorDimension;
    const vector = new Array(dim).fill(0);
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return vector;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = (hash * 31 + word.charCodeAt(j)) >>> 0;
      }
      const index = hash % dim;
      const weight = 1.0 / (1.0 + Math.log(i + 1));
      vector[index] += weight;
      vector[(index * 7 + 13) % dim] += weight * 0.5;
    }

    // L2 Normalize to unit sphere for Cosine distance
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vector[i] = vector[i] / norm;
      }
    }
    return vector;
  }

  /**
   * Health status inspection for vector database
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'offline';
    vectorEngine: string;
    collection: string;
    vectorDimension: number;
    distanceMetric: string;
    online: boolean;
    error?: string;
  }> {
    if (!this.qdrantClient) {
      return {
        status: 'offline',
        vectorEngine: 'Qdrant REST Engine',
        collection: this.collectionName,
        vectorDimension: this.vectorDimension,
        distanceMetric: 'Cosine',
        online: false,
        error: 'Qdrant client not initialized',
      };
    }

    try {
      await this.qdrantClient.getCollections();
      this.isQdrantOnline = true;
      return {
        status: 'healthy',
        vectorEngine: 'Qdrant REST Engine',
        collection: this.collectionName,
        vectorDimension: this.vectorDimension,
        distanceMetric: 'Cosine',
        online: true,
      };
    } catch (err: any) {
      this.isQdrantOnline = false;
      return {
        status: 'offline',
        vectorEngine: 'Qdrant REST Engine',
        collection: this.collectionName,
        vectorDimension: this.vectorDimension,
        distanceMetric: 'Cosine',
        online: false,
        error: err.message,
      };
    }
  }

  /**
   * Verified baseline technical catalog for grounded enterprise reference
   */
  private seedDefaultKnowledgeBase() {
    this.knowledgeBase = [
      {
        id: 'chunk-1',
        source: 'Skillora Engineering Standards v2.4',
        topic: 'NestJS Architecture & Dependency Injection',
        difficulty: 'Intermediate',
        trustLevel: 'OFFICIAL',
        content: `NestJS utilizes an Inversion of Control (IoC) container to manage class dependencies. Providers are registered in the providers array of a module and can be injected via class constructors. Singleton scope is default. For high throughput, avoid creating request-scoped providers unless mandatory, as request-scoped providers cause dependency tree re-instantiation per HTTP request.`,
        metadata: { author: 'Skillora Core Architecture Team', version: '2.4', lastUpdated: '2026-09-15' },
      },
      {
        id: 'chunk-2',
        source: 'Distributed Systems & Database Indexing Guide',
        topic: 'MongoDB Compound Indexes & Query Optimization',
        difficulty: 'Advanced',
        trustLevel: 'VERIFIED',
        content: `When designing compound indexes in MongoDB, adhere to the Equality, Sort, Range (ESR) rule. Place fields queried with exact equality first, fields used for sorting second, and range filters (such as $gt, $lt, $in) last. Use covered queries where possible to eliminate index-to-document pointer lookups, drastically reducing disk I/O in read-heavy applications.`,
        metadata: { author: 'Database Infrastructure SIG', version: '1.8', lastUpdated: '2026-08-20' },
      },
      {
        id: 'chunk-3',
        source: 'Modern RAG & Vector Retrieval Handbook',
        topic: 'Chunking Strategies & Cosine Similarity in Qdrant',
        difficulty: 'Advanced',
        trustLevel: 'OFFICIAL',
        content: `Optimal document chunk size for technical documentation ranges between 400 and 800 tokens with a 10-15% sliding window overlap. This preserves semantic continuity across sentence boundaries. In vector search, cosine distance measures the angular orientation of dense embeddings. Grounding prompts should explicitly forbid generative hallucination and require bracketed citations matching chunk identifiers.`,
        metadata: { author: 'AI Research Group', version: '3.1', lastUpdated: '2026-10-01' },
      },
      {
        id: 'chunk-4',
        source: 'Skillora Workforce Readiness Rubric',
        topic: '7-Dimensional Employability Metric',
        difficulty: 'Intermediate',
        trustLevel: 'OFFICIAL',
        content: `Workforce readiness is measured across seven balanced vectors: Technical Competency (30%), Applied Problem Solving (20%), Production Project Depth (15%), Engineering Communication (10%), Mock Interview Performance (10%), Target-Role Alignment (10%), and Continuous Learning Velocity (5%). A score of 80+ indicates verified junior-to-mid commercial readiness.`,
        metadata: { author: 'Workforce Intelligence Unit', version: '4.0', lastUpdated: '2026-10-02' },
      },
      {
        id: 'chunk-5',
        source: 'Frontend Performance & Next.js App Router',
        topic: 'Server Components vs Client Components',
        difficulty: 'Intermediate',
        trustLevel: 'VERIFIED',
        content: `In Next.js App Router, React Server Components (RSC) execute exclusively on the server, producing zero client-side JavaScript bundle footprint. Only mark components with 'use client' when requiring interactive state (useState, useEffect), browser APIs, or custom DOM event listeners. Keep client boundaries at the leaves of the component tree to maximize performance and SEO.`,
        metadata: { author: 'Frontend Systems Group', version: '2.0', lastUpdated: '2026-07-11' },
      },
    ];
    this.logger.log(`Initialized Baseline Knowledge Catalog with ${this.knowledgeBase.length} verified technical chunks.`);
  }

  /**
   * Grounded lexical keyword retrieval (catalog fallback)
   */
  private keywordRetrieve(query: string, limit = 3): { chunk: DocumentChunk; score: number }[] {
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (terms.length === 0) return [];

    const scored = this.knowledgeBase.map((chunk) => {
      let score = 0;
      const combined = `${chunk.topic} ${chunk.content} ${chunk.source}`.toLowerCase();

      for (const term of terms) {
        if (chunk.topic.toLowerCase().includes(term)) score += 5;
        if (chunk.content.toLowerCase().includes(term)) score += 2;
        if (chunk.source.toLowerCase().includes(term)) score += 1;
      }

      return { chunk, score };
    });

    const filtered = scored.filter((s) => s.score > 0);
    filtered.sort((a, b) => b.score - a.score);
    return filtered.slice(0, limit);
  }

  /**
   * Semantic vector retrieval with Qdrant vector engine and catalog fallback
   */
  async retrieve(query: string, limit = 3): Promise<RetrievalResult[]> {
    // 1. If Qdrant is online, execute dense vector semantic search
    if (this.isQdrantOnline && this.qdrantClient) {
      try {
        const queryVector = await this.getEmbedding(query);
        const searchRes = await this.qdrantClient.query(this.collectionName, {
          query: queryVector,
          limit,
          with_payload: true,
        });

        if (searchRes?.points && searchRes.points.length > 0) {
          return searchRes.points.map((pt: any) => ({
            chunk: {
              id: pt.payload?.chunkId || String(pt.id),
              source: pt.payload?.source || 'Skillora Documentation',
              topic: pt.payload?.topic || 'Technical Topic',
              difficulty: pt.payload?.difficulty || 'Intermediate',
              trustLevel: pt.payload?.trustLevel || 'VERIFIED',
              content: pt.payload?.content || '',
              metadata: pt.payload?.metadata || {},
            },
            score: typeof pt.score === 'number' ? pt.score : 0.85,
            method: 'QDRANT_VECTOR',
          }));
        }
      } catch (err: any) {
        this.logger.warn(`Qdrant vector query failed: ${err.message}. Falling back to grounded catalog search.`);
      }
    }

    // 2. Truthful catalog lexical fallback
    const keywordMatches = this.keywordRetrieve(query, limit);
    return keywordMatches.map((m) => ({
      chunk: m.chunk,
      score: m.score,
      method: 'KEYWORD_CATALOG',
    }));
  }

  /**
   * Grounded Question Answering with Verifiable Citations
   */
  async answerWithGrounding(question: string): Promise<{
    answer: string;
    citations: Array<{
      source: string;
      chunkId: string;
      topic: string;
      trustLevel: string;
      excerpt: string;
    }>;
    confidenceScore: number;
    vectorStoreStatus: 'QDRANT_LIVE' | 'CATALOG_FALLBACK' | 'QDRANT_OFFLINE';
  }> {
    const results = await this.retrieve(question, 3);

    const actualMethod = results[0]?.method;
    const vectorStoreStatus =
      actualMethod === 'QDRANT_VECTOR'
        ? 'QDRANT_LIVE'
        : this.isQdrantOnline
          ? 'CATALOG_FALLBACK'
          : 'QDRANT_OFFLINE';

    if (results.length === 0) {
      return {
        answer: 'I could not locate verified technical documentation matching this specific query in the Skillora Knowledge Base.',
        citations: [],
        confidenceScore: 0,
        vectorStoreStatus,
      };
    }

    const relevantChunks = results.map((r) => r.chunk);
    const topScore = results[0]?.score || 0;
    const calculatedConfidence =
      actualMethod === 'QDRANT_VECTOR'
        ? Math.min(Math.round(topScore * 100), 99)
        : Math.min(Math.round((topScore / 10) * 85), 95);

    const contextText = relevantChunks
      .map((c) => `[Source: "${c.source}", ID: ${c.id}]\n${c.content}`)
      .join('\n\n');

    const prompt = `You are Skillora AI's Grounded Knowledge Assistant. Answer the question STRICTLY using the provided context.
If the answer cannot be determined from the context, state that clearly without guessing.
Include explicit bracketed citations matching source titles or IDs.

Context:
${contextText}

Question: ${question}`;

    let answer: string;
    try {
      answer = await this.aiService.generateText(prompt);
    } catch {
      // If AI text generation is offline, provide grounded excerpt directly without hallucination
      answer = `Based on verified reference [${relevantChunks[0].source}]: ${relevantChunks[0].content}`;
    }

    const citations = relevantChunks.map((c) => ({
      source: c.source,
      chunkId: c.id,
      topic: c.topic,
      trustLevel: c.trustLevel,
      excerpt: c.content.slice(0, 140) + '...',
    }));

    return {
      answer,
      citations,
      confidenceScore: calculatedConfidence,
      vectorStoreStatus,
    };
  }

  /**
   * Ingest new technical document into knowledge base and Qdrant
   */
  async ingestDocument(doc: {
    source: string;
    topic: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    content: string;
    author?: string;
  }): Promise<DocumentChunk> {
    const chunkId = `chunk-${Date.now()}`;
    const pointId = randomUUID();
    const chunk: DocumentChunk = {
      id: chunkId,
      source: doc.source,
      topic: doc.topic,
      difficulty: doc.difficulty,
      trustLevel: 'VERIFIED',
      content: doc.content,
      metadata: {
        author: doc.author || 'Skillora Contributor',
        version: '1.0',
        lastUpdated: new Date().toISOString().split('T')[0],
      },
    };
    this.knowledgeBase.push(chunk);

    if (this.isQdrantOnline && this.qdrantClient) {
      try {
        const vector = await this.getEmbedding(`${chunk.topic} ${chunk.content}`);
        await this.qdrantClient.upsert(this.collectionName, {
          wait: true,
          points: [
            {
              id: pointId,
              vector,
              payload: {
                chunkId: chunk.id,
                source: chunk.source,
                topic: chunk.topic,
                difficulty: chunk.difficulty,
                trustLevel: chunk.trustLevel,
                content: chunk.content,
                metadata: chunk.metadata,
              },
            },
          ],
        });
        this.logger.log(`Ingested document "${doc.topic}" into Qdrant collection "${this.collectionName}".`);
      } catch (err: any) {
        this.logger.warn(`Failed to upsert document chunk into Qdrant: ${err.message}`);
      }
    }

    return chunk;
  }
}
