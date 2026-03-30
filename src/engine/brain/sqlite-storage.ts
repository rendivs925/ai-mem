// SQLite Storage Backend for Brain Engine
// Implements StorageBackend interface using ai-mem's existing database

import type { Database } from "bun:sqlite";
import type { CMU, CMUMetadata, MemoryTier, EmotionalTag } from "../../types/brain/memory";
import type { StorageBackend } from "./storage";
import { MemoryTier as Tier } from "../../types/brain/memory";
import { computeObservationContentHash } from "../../services/sqlite/observations/store";

export class SQLiteStorageBackend implements StorageBackend {
  constructor(private db: Database) {}

  async getSyncToken(): Promise<string> {
    const row = this.db.query(`
      SELECT
        COUNT(*) AS total,
        COALESCE(MAX(id), 0) AS max_id,
        COALESCE(MAX(created_at_epoch), 0) AS max_created_at,
        COALESCE(MAX(last_accessed), 0) AS max_last_accessed
      FROM observations
      WHERE tier IS NOT NULL
    `).get() as {
      total: number;
      max_id: number;
      max_created_at: number;
      max_last_accessed: number;
    };

    return [
      row.total,
      row.max_id,
      row.max_created_at,
      row.max_last_accessed,
    ].join(":");
  }

  private ensureSession(sessionId: string, project: string, timestamp: number): void {
    const startedAt = new Date(timestamp).toISOString();
    this.db.query(`
      INSERT OR IGNORE INTO sdk_sessions (
        content_session_id,
        memory_session_id,
        project,
        started_at,
        started_at_epoch,
        status
      ) VALUES (?, ?, ?, ?, ?, 'active')
    `).run(sessionId, sessionId, project, startedAt, timestamp);
  }

  async getAllMemories(): Promise<CMU[]> {
    const rows = this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
             facts, files_read, files_modified,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE tier IS NOT NULL
    `).all() as BrainObservationRow[];

    return rows.map(this.rowToCMU);
  }

  async getMemoryById(id: string): Promise<CMU | null> {
    const row = this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
             facts, files_read, files_modified,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE id = ?
    `).get(id) as BrainObservationRow | undefined;

    return row ? this.rowToCMU(row) : null;
  }

  async getMemoriesByProject(project: string): Promise<CMU[]> {
    const rows = this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
             facts, files_read, files_modified,
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
      SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
             facts, files_read, files_modified,
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

  async updateAssociations(id: string, associations: string[]): Promise<void> {
    this.db.query(`
      UPDATE observations SET associations = ? WHERE id = ?
    `).run(JSON.stringify(associations), id);
  }

  async updateQuality(id: string, tier: MemoryTier, importance: number, decayRate: number): Promise<void> {
    this.db.query(`
      UPDATE observations
      SET tier = ?, importance = ?, decay_rate = ?
      WHERE id = ?
    `).run(tier, importance, decayRate, id);
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

  async storeMemory(cmu: CMU): Promise<string> {
    const createdAt = new Date(cmu.metadata.createdAt).toISOString();
    const contentHash = computeObservationContentHash(
      cmu.sessionId,
      cmu.content.title,
      cmu.content.narrative,
    );
    this.ensureSession(cmu.sessionId, cmu.project, cmu.metadata.createdAt);
    const result = this.db.query(`
      INSERT INTO observations (
        memory_session_id, project, text, type, title, facts, narrative, concepts,
        files_read, files_modified, created_at, created_at_epoch, tier,
        importance, base_activation, decay_rate, tags, associations,
        last_accessed, access_count, content_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cmu.sessionId,
      cmu.project,
      cmu.content.narrative,
      cmu.memoryType,
      cmu.content.title,
      JSON.stringify(cmu.content.facts),
      cmu.content.narrative,
      JSON.stringify(cmu.content.concepts),
      JSON.stringify(cmu.content.filesRead),
      JSON.stringify(cmu.content.filesModified),
      createdAt,
      cmu.metadata.createdAt,
      cmu.tier,
      cmu.metadata.importance,
      cmu.metadata.baseActivation,
      cmu.metadata.decayRate,
      JSON.stringify(cmu.tags),
      JSON.stringify(cmu.associations),
      cmu.metadata.lastAccessed,
      cmu.metadata.accessCount,
      contentHash,
    );
    return String(result.lastInsertRowid);
  }

  async searchByKeywords(keywords: string[], limit: number = 50): Promise<CMU[]> {
    let rows: BrainObservationRow[];

    if (keywords.length === 0) {
      rows = this.db.query(`
        SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
               facts, files_read, files_modified,
               importance, base_activation, decay_rate, tags, associations,
               last_accessed, access_count, created_at_epoch
        FROM observations
        WHERE tier IS NOT NULL
        ORDER BY base_activation DESC
        LIMIT ?
      `).all(limit) as BrainObservationRow[];
      return rows.map(this.rowToCMU);
    }

    const clauses = keywords
      .map(
        () => "(COALESCE(text, '') LIKE ? OR COALESCE(title, '') LIKE ? OR COALESCE(narrative, '') LIKE ? OR COALESCE(concepts, '') LIKE ?)",
      )
      .join(" OR ");
    const params = keywords.flatMap((keyword) => {
      const pattern = `%${keyword}%`;
      return [pattern, pattern, pattern, pattern];
    });

    rows = this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
             facts, files_read, files_modified,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE tier IS NOT NULL AND (${clauses})
      ORDER BY base_activation DESC
      LIMIT ?
    `).all(...params, limit) as BrainObservationRow[];

    return rows.map(this.rowToCMU);
  }

  private rowToCMU(row: BrainObservationRow): CMU {
    const tags = JSON.parse(row.tags || "[]") as string[];
    const associations = JSON.parse(row.associations || "[]") as string[];
    const facts = JSON.parse(row.facts || "[]") as string[];
    const concepts = JSON.parse(row.concepts || "[]") as string[];
    const filesRead = JSON.parse(row.files_read || "[]") as string[];
    const filesModified = JSON.parse(row.files_modified || "[]") as string[];

    return {
      id: String(row.id),
      sessionId: row.memory_session_id,
      project: row.project,
      tier: (row.tier as MemoryTier) || Tier.Episodic,
      memoryType: row.type as never,
      content: {
        title: row.title || "",
        narrative: row.narrative || row.text || "",
        facts,
        concepts,
        filesRead,
        filesModified,
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
  id: number | string;
  memory_session_id: string;
  project: string;
  tier: string;
  type: string;
  text: string | null;
  title: string | null;
  facts: string | null;
  narrative: string | null;
  concepts: string | null;
  files_read: string | null;
  files_modified: string | null;
  importance: number;
  base_activation: number;
  decay_rate: number;
  tags: string;
  associations: string;
  last_accessed: number;
  access_count: number;
  created_at_epoch: number;
}
