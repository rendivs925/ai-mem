// Qdrant Vector Search Integration
// Optional semantic search using Qdrant vector database

import type { QdrantClient } from "@qdrant/js-client-rest";
import type { CMU, RetrievalResult } from "../../types/brain/memory";

export interface VectorSearchConfig {
  url: string;
  collectionName: string;
  vectorSize?: number;
}

export class QdrantVectorSearch {
  private client: QdrantClient | null = null;
  private collectionName: string;
  private vectorSize: number;
  private initialized = false;

  constructor(config: VectorSearchConfig) {
    this.collectionName = config.collectionName;
    this.vectorSize = config.vectorSize || 1536;
  }

  async initialize(): Promise<void> {
    try {
      const { QdrantClient } = await import("@qdrant/js-client-rest");
      this.client = new QdrantClient({ url: this.client ? undefined : "http://localhost:6333" });
      
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === this.collectionName);

      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: "Cosine",
          },
        });
      }

      this.initialized = true;
    } catch (error) {
      console.warn("Qdrant initialization failed:", error);
      this.initialized = false;
    }
  }

  async addMemory(cmu: CMU): Promise<string | null> {
    if (!this.client || !this.initialized) return null;

    try {
      const vector = await this.embedText(cmu.content.narrative + " " + cmu.content.title);

      const pointId = await this.client.upsert(this.collectionName, {
        points: [
          {
            id: cmu.id,
            vector,
            payload: {
              title: cmu.content.title,
              narrative: cmu.content.narrative,
              concepts: cmu.content.concepts,
              project: cmu.project,
              tier: cmu.tier,
              importance: cmu.metadata.importance,
            },
          },
        ],
      });

      return cmu.id;
    } catch (error) {
      console.error("Failed to add memory to Qdrant:", error);
      return null;
    }
  }

  async search(query: string, limit: number = 50): Promise<Array<{ id: string; score: number }>> {
    if (!this.client || !this.initialized) return [];

    try {
      const vector = await this.embedText(query);

      const results = await this.client.search(this.collectionName, {
        vector,
        limit,
        with_payload: true,
      });

      return results.map((r) => ({
        id: r.id as string,
        score: r.score || 0,
      }));
    } catch (error) {
      console.error("Qdrant search failed:", error);
      return [];
    }
  }

  async deleteMemory(id: string): Promise<void> {
    if (!this.client || !this.initialized) return;

    try {
      await this.client.delete(this.collectionName, {
        points: [id],
      });
    } catch (error) {
      console.error("Failed to delete memory from Qdrant:", error);
    }
  }

  async deleteAll(): Promise<void> {
    if (!this.client || !this.initialized) return;

    try {
      await this.client.delete(this.collectionName, {
        filter: {},
      });
    } catch (error) {
      console.error("Failed to delete all from Qdrant:", error);
    }
  }

  private async embedText(text: string): Promise<number[]> {
    try {
      const response = await fetch("http://localhost:11434/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "nomic-embed-text",
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API failed: ${response.status}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.warn("Embedding generation failed, using fallback:", error);
      return this.fallbackEmbed(text);
    }
  }

  private fallbackEmbed(text: string): number[] {
    const hash = this.simpleHash(text);
    const vector: number[] = [];
    for (let i = 0; i < this.vectorSize; i++) {
      vector.push(((hash >> i) % 1000) / 1000 - 0.5);
    }
    return vector;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export function createVectorSearch(config: VectorSearchConfig): QdrantVectorSearch {
  return new QdrantVectorSearch(config);
}
