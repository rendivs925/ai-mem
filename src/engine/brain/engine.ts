// Brain Engine - Main orchestration for brain-inspired memory
// Integrates ACT-R activation, spreading activation, and pruning

import type { Database } from "bun:sqlite";
import path from "path";
import type { CMU, RetrievalResult, SearchFilters, MemoryTier } from "../../types/brain/memory";
import { MemoryTier as Tier } from "../../types/brain/memory";
import { calculateBaseActivation, calculateRetentionScore } from "./activation";
import { MemoryGraph } from "./graph";
import { runConsolidation } from "./pruning/consolidation";
import { SQLiteStorageBackend } from "./sqlite-storage";
import { parseBrainSettings, defaultBrainSettings, type BrainSettings } from "../../config/brain-settings";
import type { StorageBackend } from "./storage";

const TIER_RETRIEVAL_WEIGHT: Record<MemoryTier, number> = {
  [Tier.Sensory]: 0.35,
  [Tier.Working]: 0.85,
  [Tier.Episodic]: 1.2,
  [Tier.Semantic]: 2.3,
  [Tier.Procedural]: 2.0,
};

const NOISY_TOOL_PATTERN = /^tool:\s+(read|glob|grep|search|find|ls|list|view)\b/i;

function projectMatches(project: string, allowedProjects: string[]): boolean {
  if (allowedProjects.includes(project)) {
    return true;
  }

  const normalizedProject = project.replace(/\\/g, "/");
  const projectBase = path.posix.basename(normalizedProject);

  return allowedProjects.some((allowed) => {
    const normalizedAllowed = allowed.replace(/\\/g, "/");
    return (
      normalizedAllowed === normalizedProject ||
      path.posix.basename(normalizedAllowed) === projectBase
    );
  });
}

export class BrainEngine {
  private storage: StorageBackend;
  private settings: BrainSettings;
  private graph: MemoryGraph | null = null;
  private lastSyncToken: string | null = null;

  constructor(db: Database, settings?: Partial<BrainSettings>) {
    this.storage = new SQLiteStorageBackend(db);
    this.settings = { ...defaultBrainSettings, ...settings };
  }

  async initialize(): Promise<void> {
    await this.refreshGraph();
  }

  private async refreshGraph(): Promise<void> {
    this.graph = new MemoryGraph();
    const memories = await this.storage.getAllMemories();
    for (const memory of memories) {
      this.graph.addNode(memory);
    }
    this.lastSyncToken = await this.storage.getSyncToken();
  }

  private async ensureFreshGraph(): Promise<void> {
    const currentToken = await this.storage.getSyncToken();
    if (!this.graph || this.lastSyncToken !== currentToken) {
      await this.refreshGraph();
    }
  }

  async captureMemory(
    sessionId: string,
    project: string,
    content: {
      title: string;
      narrative: string;
      facts: string[];
      concepts: string[];
      filesRead: string[];
      filesModified: string[];
    },
    memoryType: string,
    importance: number = 0.5
  ): Promise<CMU> {
    const now = Date.now();
    const tier = this.determineTier(content);
    const normalizedImportance = this.normalizeImportance(content, tier, memoryType, importance);

    const cmu: CMU = {
      id: "",
      sessionId,
      project,
      tier,
      memoryType: memoryType as never,
      content,
      metadata: {
        createdAt: now,
        lastAccessed: now,
        accessCount: 1,
        importance: normalizedImportance,
        baseActivation: calculateBaseActivation(1, now, this.settings.actr.decayParameter),
        decayRate: this.settings.tiers[tier]?.decay ?? 0.5,
      },
      tags: [],
      associations: [],
    };

    const id = await this.storage.storeMemory(cmu);
    const stored = { ...cmu, id };

    if (this.graph) {
      this.graph.addNode(stored);
    }
    this.lastSyncToken = null;

    return stored;
  }

  async retrieveMemories(
    query: string,
    filters?: SearchFilters,
    limit: number = 50
  ): Promise<RetrievalResult[]> {
    await this.ensureFreshGraph();
    const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
    const memories = await this.storage.searchByKeywords(keywords, limit * 2);

    let filtered = memories;

    if (filters?.tiers?.length) {
      const allowedTiers = filters.tiers;
      filtered = filtered.filter((m: CMU) => allowedTiers.includes(m.tier));
    }

    if (filters?.projects?.length) {
      const allowedProjects = filters.projects;
      filtered = filtered.filter((m: CMU) => projectMatches(m.project, allowedProjects));
    }

    if (filters?.minImportance !== undefined) {
      const minImp = filters.minImportance;
      filtered = filtered.filter((m: CMU) => m.metadata.importance >= minImp);
    }

    if (filters?.since) {
      const sinceTime = filters.since;
      filtered = filtered.filter((m: CMU) => m.metadata.createdAt >= sinceTime);
    }

    const results: RetrievalResult[] = filtered.map((cmu) => ({
      cmu,
      score: this.calculateRetrievalScore(cmu, query),
      activation: cmu.metadata.baseActivation,
      source: "fts5",
    }));

    if (this.graph && filters?.projects?.length === 1) {
      const spreadingResults = this.graph.retrieveContext(
        results.slice(0, 5).map((r) => r.cmu.id),
        3
      );

      for (const id of spreadingResults) {
        if (!results.find((r) => r.cmu.id === id)) {
          const memory = await this.storage.getMemoryById(id);
          if (memory) {
            results.push({
              cmu: memory,
              score: this.calculateRetrievalScore(memory, query) * 0.75,
              activation: memory.metadata.baseActivation,
              source: "spreading",
            });
          }
        }
      }
    }

    return this.rankAndTrimResults(results, query, limit);
  }

  async recordAccess(memoryId: string): Promise<void> {
    const now = Date.now();
    await this.storage.updateLastAccessed(memoryId, now);
    await this.storage.incrementAccessCount(memoryId);

    const memory = await this.storage.getMemoryById(memoryId);
    if (memory) {
      const newActivation = calculateBaseActivation(
        memory.metadata.accessCount + 1,
        now,
        this.settings.actr.decayParameter
      );
      await this.storage.updateActivation(memoryId, newActivation);
    }
    this.lastSyncToken = null;
  }

  async getMemoryById(memoryId: string): Promise<CMU | null> {
    return this.storage.getMemoryById(memoryId);
  }

  async consolidate(): Promise<{ merged: number; pruned: number; linked: number }> {
    await this.ensureFreshGraph();
    const memories = await this.storage.getAllMemories();

    const result = await runConsolidation(memories, {
      dedupeThreshold: this.settings.pruning.dedupeSimilarity,
      importanceThreshold: this.settings.pruning.importanceThreshold,
      maxAgeDays: this.settings.pruning.maxAgeDays,
      maxPerTier: Object.fromEntries(
        Object.entries(this.settings.tiers).map(([tier, config]) => [tier, config.maxCount])
      ) as Record<string, number>,
    });

    for (const memory of memories) {
      const tier = this.determineTier(memory.content);
      const importance = this.normalizeImportance(
        memory.content,
        tier,
        memory.memoryType,
        memory.metadata.importance,
      );
      const decayRate = this.settings.tiers[tier]?.decay ?? memory.metadata.decayRate;

      if (
        tier !== memory.tier ||
        Math.abs(importance - memory.metadata.importance) > 0.001 ||
        Math.abs(decayRate - memory.metadata.decayRate) > 0.001
      ) {
        await this.storage.updateQuality(memory.id, tier, importance, decayRate);
      }
    }

    for (const [id, associations] of Object.entries(result.associationsById)) {
      await this.storage.updateAssociations(id, associations);
    }

    for (const draft of result.synthesized) {
      await this.storage.storeMemory({
        id: "",
        sessionId: draft.sessionId,
        project: draft.project,
        tier: draft.tier,
        memoryType: draft.memoryType,
        content: draft.content,
        metadata: {
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 1,
          importance: draft.importance,
          baseActivation: calculateBaseActivation(1, Date.now(), this.settings.actr.decayParameter),
          decayRate: this.settings.tiers[draft.tier]?.decay ?? 0.5,
        },
        tags: [],
        associations: draft.associations,
      });
    }

    for (const id of result.removedIds) {
      await this.storage.deleteMemory(id);
    }

    await this.refreshGraph();

    return {
      merged: result.merged,
      pruned: result.pruned,
      linked: result.linked,
    };
  }

  async getStats(): Promise<{
    total: number;
    byTier: Record<MemoryTier, number>;
    avgActivation: number;
  }> {
    await this.ensureFreshGraph();
    const memories = await this.storage.getAllMemories();

    const byTier: Record<MemoryTier, number> = {
      [Tier.Sensory]: 0,
      [Tier.Working]: 0,
      [Tier.Episodic]: 0,
      [Tier.Semantic]: 0,
      [Tier.Procedural]: 0,
    };

    let totalActivation = 0;

    for (const memory of memories) {
      byTier[memory.tier] = (byTier[memory.tier] || 0) + 1;
      totalActivation += memory.metadata.baseActivation;
    }

    return {
      total: memories.length,
      byTier,
      avgActivation: memories.length > 0 ? totalActivation / memories.length : 0,
    };
  }

  private determineTier(content: {
    filesRead: string[];
    filesModified: string[];
    narrative: string;
    facts: string[];
    concepts: string[];
    title: string;
  }): MemoryTier {
    const loweredTitle = content.title.toLowerCase();
    const loweredNarrative = content.narrative.toLowerCase();

    if (
      loweredTitle.startsWith("tool: read") ||
      loweredTitle.startsWith("tool: glob") ||
      loweredTitle.startsWith("tool: grep") ||
      loweredTitle.startsWith("tool: search") ||
      loweredTitle.startsWith("tool: find") ||
      loweredTitle.startsWith("tool: ls") ||
      loweredTitle.startsWith("tool: list") ||
      loweredTitle.startsWith("tool: view")
    ) {
      return Tier.Sensory;
    }

    if (
      loweredTitle.startsWith("tool:") ||
      loweredTitle.startsWith("procedure:") ||
      loweredTitle.startsWith("workflow:") ||
      loweredNarrative.includes("step ") ||
      loweredNarrative.includes("procedure")
    ) {
      return Tier.Procedural;
    }

    if (content.filesModified.length > 0) {
      return Tier.Episodic;
    }

    if (content.filesRead.length > 5) {
      return Tier.Episodic;
    }

    if (content.facts.length > 0 || content.concepts.length >= 3) {
      return Tier.Semantic;
    }

    if (content.narrative.length < 160) {
      return Tier.Working;
    }

    return Tier.Episodic;
  }

  private normalizeImportance(
    content: {
      title: string;
      narrative: string;
      facts: string[];
      concepts: string[];
      filesRead: string[];
      filesModified: string[];
    },
    tier: MemoryTier,
    memoryType: string,
    importance: number,
  ): number {
    let score = importance;
    const loweredTitle = content.title.toLowerCase();
    const loweredNarrative = content.narrative.toLowerCase();

    if (tier === Tier.Sensory) score -= 0.25;
    if (tier === Tier.Semantic) score += 0.15;
    if (tier === Tier.Procedural) score += 0.1;
    if (content.filesModified.length > 0) score += 0.1;
    if (memoryType === "decision" || memoryType === "change" || loweredNarrative.includes("root cause")) {
      score += 0.1;
    }
    if (NOISY_TOOL_PATTERN.test(loweredTitle)) score -= 0.15;

    return Math.max(0.1, Math.min(0.98, score));
  }

  private calculateRetrievalScore(cmu: CMU, query: string): number {
    const tierWeight = TIER_RETRIEVAL_WEIGHT[cmu.tier] ?? 1;
    const retention = calculateRetentionScore(cmu.metadata);
    const keywordBonus = this.keywordBonus(cmu, query);
    const evidencePenalty = this.evidencePenalty(cmu, query);

    return retention * tierWeight + keywordBonus - evidencePenalty;
  }

  private keywordBonus(cmu: CMU, query: string): number {
    const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) return 0;

    const title = cmu.content.title.toLowerCase();
    const narrative = cmu.content.narrative.toLowerCase();
    const concepts = cmu.content.concepts.map((item) => item.toLowerCase());
    let bonus = 0;

    for (const keyword of keywords) {
      if (title.includes(keyword)) bonus += 0.45;
      if (concepts.some((concept) => concept.includes(keyword))) bonus += 0.3;
      if (narrative.includes(keyword)) bonus += 0.15;
    }

    return bonus;
  }

  private evidencePenalty(cmu: CMU, query: string): number {
    const loweredQuery = query.toLowerCase();
    const provenanceQuery =
      loweredQuery.includes("why") ||
      loweredQuery.includes("where") ||
      loweredQuery.includes("evidence") ||
      loweredQuery.includes("trace") ||
      loweredQuery.includes("read");

    if (provenanceQuery) return 0;
    if (cmu.tier === Tier.Sensory) return 0.8;
    if (NOISY_TOOL_PATTERN.test(cmu.content.title.toLowerCase())) return 0.45;
    return 0;
  }

  private rankAndTrimResults(results: RetrievalResult[], query: string, limit: number): RetrievalResult[] {
    const sorted = [...results].sort((a, b) => b.score - a.score);
    const deduped: RetrievalResult[] = [];
    const seen = new Set<string>();
    const tierCounts: Partial<Record<MemoryTier, number>> = {};
    const allowMoreSensory = /\b(read|evidence|trace|raw|provenance)\b/i.test(query);

    for (const result of sorted) {
      if (seen.has(result.cmu.id)) continue;
      const tier = result.cmu.tier;
      const count = tierCounts[tier] ?? 0;
      if (tier === Tier.Sensory && !allowMoreSensory && count >= 1) continue;
      if (tier === Tier.Working && count >= 2) continue;
      seen.add(result.cmu.id);
      tierCounts[tier] = count + 1;
      deduped.push(result);
      if (deduped.length >= limit) break;
    }

    return deduped;
  }

  getSettings(): BrainSettings {
    return this.settings;
  }
}

export function createBrainEngine(
  db: Database,
  settings?: Partial<BrainSettings>
): BrainEngine {
  return new BrainEngine(db, settings);
}
