// SQLite Storage Backend for Brain Engine
// Implements StorageBackend interface using ai-mem's existing database

import type { Database } from "bun:sqlite";
import type { CMU, CMUMetadata, MemoryTier, EmotionalTag } from "../../types/brain/memory";
import type { StorageBackend } from "./storage";
import { MemoryTier as Tier, EmotionalTag as Tag } from "../../types/brain/memory";

export class SQLiteStorageBackend implements StorageBackend {
  constructor(private db: Database) {}

  async getAllMemories(): Promise<CMU[]> {
    const rows = this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, concept,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE tier IS NOT NULL
    `).all() as BrainObservationRow[];

    return rows.map(this.rowToCMU);
  }

  async getMemoryById(id: string): Promise<CMU | null> {
    const row = this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, concept,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE id = ?
    `).get(id) as BrainObservationRow | undefined;

    return row ? this.rowToCMU(row) : null;
  }

  async getMemoriesByProject(project: string): Promise<CMU[]> {
    const rows = this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, concept,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE project = ? AND tier IS NOT NULL
      ORDER BY base_activation DESC
    `).all(project) as BrainObservationRow[];

    return rows.map(this.rowToCMU);
  }

  async getMemoriesByTier(tier: MemoryTier): Promise<CMU[]> {
    const rows = this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, concept,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE tier = ?
      ORDER BY base_activation DESC
    `).all(tier) as BrainObservationRow[];

    return rows.map(this.rowToCMU);
  }

  async updateActivation(id: string, activation: number): Promise<void> {
    this.db.query(`
      UPDATE observations SET base_activation = ? WHERE id = ?
    `).run(activation, id);
  }

  async updateLastAccessed(id: string, timestamp: number): Promise<void> {
    this.db.query(`
      UPDATE observations SET last_accessed = ? WHERE id = ?
    `).run(timestamp, id);
  }

  async incrementAccessCount(id: string): Promise<void> {
    this.db.query(`
      UPDATE observations SET access_count = access_count + 1 WHERE id = ?
    `).run(id);
  }

  async deleteMemory(id: string): Promise<void> {
    this.db.query(`DELETE FROM observations WHERE id = ?`).run(id);
  }

  async storeMemory(cmu: CMU): Promise<void> {
    this.db.query(`
      INSERT INTO observations (
        id, memory_session_id, project, tier, type, text, title, concept,
        importance, base_activation, decay_rate, tags, associations,
        last_accessed, access_count, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cmu.id,
      cmu.sessionId,
      cmu.project,
      cmu.tier,
      cmu.memoryType,
      cmu.content.narrative,
      cmu.content.title,
      cmu.content.concepts.join(", "),
      cmu.metadata.importance,
      cmu.metadata.baseActivation,
      cmu.metadata.decayRate,
      JSON.stringify(cmu.tags),
      JSON.stringify(cmu.associations),
      cmu.metadata.lastAccessed,
      cmu.metadata.accessCount,
      cmu.metadata.createdAt
    );
  }

  async searchByKeywords(keywords: string[], limit: number = 50): Promise<CMU[]> {
    const pattern = keywords.map((k) => `%${k}%`).join(" ");
    const rows = this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, concept,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE tier IS NOT NULL AND (text LIKE ? OR title LIKE ? OR concept LIKE ?)
      ORDER BY base_activation DESC
      LIMIT ?
    `).all(pattern, pattern, pattern, limit) as BrainObservationRow[];

    return rows.map(this.rowToCMU);
  }

  private rowToCMU(row: BrainObservationRow): CMU {
    const tags = JSON.parse(row.tags || "[]") as string[];
    const associations = JSON.parse(row.associations || "[]") as string[];

    return {
      id: String(row.id),
      sessionId: row.memory_session_id,
      project: row.project,
      tier: (row.tier as MemoryTier) || Tier.Episodic,
      memoryType: row.type as never,
      content: {
        title: row.title || "",
        narrative: row.text || "",
        facts: [],
        concepts: row.concept ? row.concept.split(", ").filter(Boolean) : [],
        filesRead: [],
        filesModified: [],
      },
      metadata: {
        createdAt: row.created_at_epoch,
        lastAccessed: row.last_accessed || row.created_at_epoch,
        accessCount: row.access_count || 0,
        importance: row.importance || 0.5,
        baseActivation: row.base_activation || 0,
        decayRate: row.decay_rate || 0.5,
      },
      tags: tags as EmotionalTag[],
      associations,
    };
  }
}

interface BrainObservationRow {
  id: number;
  memory_session_id: string;
  project: string;
  tier: string;
  type: string;
  text: string;
  title: string;
  concept: string;
  importance: number;
  base_activation: number;
  decay_rate: number;
  tags: string;
  associations: string;
  last_accessed: number;
  access_count: number;
  created_at_epoch: number;
}
