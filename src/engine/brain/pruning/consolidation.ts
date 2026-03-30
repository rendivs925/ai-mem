// Sleep Consolidation Cycle
// Based on research: Sleep cycle for memory linking and pruning

import type { CMU, MemoryType, MemoryTier } from "../../../types/brain/memory";
import { MemoryTier as Tier, MemoryType as Type } from "../../../types/brain/memory";
import { MemoryGraph } from "../graph";
import { findDuplicates } from "./dedupe";
import { pruneByImportance, pruneByAge } from "./cull";
import { PruningError } from "../../../types/brain/error";

export interface SynthesisDraft {
  sessionId: string;
  project: string;
  tier: MemoryTier;
  memoryType: MemoryType;
  importance: number;
  associations: string[];
  content: {
    title: string;
    narrative: string;
    facts: string[];
    concepts: string[];
    filesRead: string[];
    filesModified: string[];
  };
}

export interface ConsolidationResult {
  merged: number;
  pruned: number;
  linked: number;
  removedIds: string[];
  associationsById: Record<string, string[]>;
  synthesized: SynthesisDraft[];
}

export async function runConsolidation(
  cmus: CMU[],
  options: {
    dedupeThreshold?: number;
    importanceThreshold?: number;
    maxAgeDays?: number;
    maxPerTier?: Record<string, number>;
  } = {}
): Promise<ConsolidationResult> {
  const {
    dedupeThreshold = 0.95,
    importanceThreshold = 0.1,
    maxAgeDays = 30,
    maxPerTier = {},
  } = options;

  const graph = new MemoryGraph();

  for (const cmu of cmus) {
    graph.addNode(cmu);
  }

  let merged = 0;
  let pruned = 0;
  let linked = 0;

  try {
    const duplicates = findDuplicates(cmus, dedupeThreshold);
    const toRemove = new Set<string>();
    const associationsById: Record<string, Set<string>> = Object.fromEntries(
      cmus.map((cmu) => [cmu.id, new Set(cmu.associations)]),
    );

    for (const dup of duplicates) {
      toRemove.add(dup.remove.id);
      associationsById[dup.keep.id]?.add(dup.remove.id);
      for (const association of dup.remove.associations) {
        associationsById[dup.keep.id]?.add(association);
      }
      merged++;
    }

    linked = linkRelatedMemories(cmus, graph, associationsById);

    const remaining = cmus.filter((cmu) => !toRemove.has(cmu.id));
    const synthesized = synthesizeMemories(remaining, associationsById);

    const tierCounts = new Map<string, number>();
    for (const cmu of remaining) {
      const count = tierCounts.get(cmu.tier) || 0;
      tierCounts.set(cmu.tier, count + 1);
    }

    for (const [tier, max] of Object.entries(maxPerTier)) {
      const count = tierCounts.get(tier) || 0;
      if (count > max) {
        const tierMemories = remaining.filter((cmu) => cmu.tier === tier);
        const prunedCount = count - max;
        const toPrune = pruneByImportance(
          tierMemories,
          max,
          importanceThreshold
        ).slice(-prunedCount);

        for (const cmu of toPrune) {
          toRemove.add(cmu.id);
          pruned++;
        }
      }
    }

    const agedPruned = pruneByAge(remaining, maxAgeDays);
    for (const cmu of remaining) {
      if (!agedPruned.find((candidate) => candidate.id === cmu.id)) {
        toRemove.add(cmu.id);
      }
    }
    pruned = toRemove.size - merged;

    return {
      merged,
      pruned,
      linked,
      removedIds: Array.from(toRemove),
      associationsById: Object.fromEntries(
        Object.entries(associationsById)
          .filter(([id]) => !toRemove.has(id))
          .map(([id, associations]) => [
            id,
            Array.from(associations).filter((association) => association !== id && !toRemove.has(association)),
          ]),
      ),
      synthesized,
    };
  } catch (error) {
    throw new PruningError(
      `Consolidation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
  }
}

function linkRelatedMemories(
  cmus: CMU[],
  graph: MemoryGraph,
  associationsById: Record<string, Set<string>>,
): number {
  let links = 0;

  for (let i = 0; i < cmus.length; i++) {
    for (const concept of cmus[i].content.concepts) {
      for (let j = i + 1; j < cmus.length; j++) {
        if (cmus[j].content.concepts.includes(concept)) {
          if (!cmus[i].associations.includes(cmus[j].id)) {
            graph.addAssociation(cmus[i].id, cmus[j].id, 0.5);
            associationsById[cmus[i].id]?.add(cmus[j].id);
            associationsById[cmus[j].id]?.add(cmus[i].id);
            links++;
          }
        }
      }

      for (const file of cmus[i].content.filesRead) {
        for (let j = 0; j < cmus.length; j++) {
          if (i === j) continue;
          if (cmus[j].content.filesRead.includes(file) ||
              cmus[j].content.filesModified.includes(file)) {
            if (!cmus[i].associations.includes(cmus[j].id)) {
              graph.addAssociation(cmus[i].id, cmus[j].id, 0.7);
              associationsById[cmus[i].id]?.add(cmus[j].id);
              associationsById[cmus[j].id]?.add(cmus[i].id);
              links++;
            }
          }
        }
      }
    }
  }

  return links;
}

function synthesizeMemories(
  cmus: CMU[],
  associationsById: Record<string, Set<string>>,
): SynthesisDraft[] {
  const drafts: SynthesisDraft[] = [];
  const existingKeys = new Set(
    cmus.map((cmu) => `${cmu.tier}:${cmu.content.title.trim().toLowerCase()}:${cmu.project}`),
  );

  for (const cluster of clusterSemanticCandidates(cmus)) {
    const draft = buildSemanticDraft(cluster);
    const key = `${draft.tier}:${draft.content.title.trim().toLowerCase()}:${draft.project}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    drafts.push(draft);
  }

  for (const cluster of clusterProceduralCandidates(cmus)) {
    const draft = buildProceduralDraft(cluster);
    const key = `${draft.tier}:${draft.content.title.trim().toLowerCase()}:${draft.project}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    drafts.push(draft);
  }

  for (const cluster of clusterSessionTrajectories(cmus)) {
    const draft = buildTrajectoryDraft(cluster);
    const key = `${draft.tier}:${draft.content.title.trim().toLowerCase()}:${draft.project}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    drafts.push(draft);
  }

  for (const cluster of clusterInvariantCandidates(cmus)) {
    const draft = buildInvariantDraft(cluster);
    const key = `${draft.tier}:${draft.content.title.trim().toLowerCase()}:${draft.project}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    drafts.push(draft);
  }

  return drafts;
}

function clusterSemanticCandidates(cmus: CMU[]): CMU[][] {
  const fileGroups = new Map<string, CMU[]>();
  const conceptGroups = new Map<string, CMU[]>();

  for (const cmu of cmus) {
    if (cmu.tier === Tier.Procedural) continue;
    if (cmu.content.title.startsWith("Knowledge:") || cmu.content.title.startsWith("Workflow:")) continue;

    for (const file of new Set([...cmu.content.filesRead, ...cmu.content.filesModified])) {
      const key = `${cmu.project}:file:${file}`;
      fileGroups.set(key, [...(fileGroups.get(key) ?? []), cmu]);
    }

    for (const concept of cmu.content.concepts) {
      if (concept.startsWith("source:") || concept.length < 4) continue;
      const key = `${cmu.project}:concept:${concept}`;
      conceptGroups.set(key, [...(conceptGroups.get(key) ?? []), cmu]);
    }
  }

  return [...fileGroups.values(), ...conceptGroups.values()]
    .map(uniqueById)
    .filter((group) => group.length >= 2);
}

function clusterProceduralCandidates(cmus: CMU[]): CMU[][] {
  const groups = new Map<string, CMU[]>();

  for (const cmu of cmus) {
    if (cmu.tier !== Tier.Procedural) continue;
    const normalized = normalizeProcedureKey(cmu.content.title);
    if (!normalized) continue;
    const key = `${cmu.project}:${normalized}`;
    groups.set(key, [...(groups.get(key) ?? []), cmu]);
  }

  return Array.from(groups.values()).filter((group) => group.length >= 2);
}

function clusterSessionTrajectories(cmus: CMU[]): CMU[][] {
  const groups = new Map<string, CMU[]>();

  for (const cmu of cmus) {
    if (cmu.tier === Tier.Sensory) continue;
    if (cmu.content.title.startsWith("Knowledge:") || cmu.content.title.startsWith("Workflow:")) continue;
    const key = `${cmu.project}:${cmu.sessionId}`;
    groups.set(key, [...(groups.get(key) ?? []), cmu]);
  }

  return Array.from(groups.values())
    .map((group) =>
      [...group].sort((a, b) => a.metadata.createdAt - b.metadata.createdAt),
    )
    .filter((group) => {
      const meaningful = group.filter(
        (cmu) => cmu.tier === Tier.Procedural || cmu.memoryType === Type.Change || cmu.content.filesModified.length > 0,
      );
      return meaningful.length >= 3;
    });
}

function clusterInvariantCandidates(cmus: CMU[]): CMU[][] {
  const groups = new Map<string, CMU[]>();

  for (const cmu of cmus) {
    if (cmu.content.title.startsWith("Knowledge:") || cmu.content.title.startsWith("Workflow:")) continue;
    const lines = [cmu.content.title, cmu.content.narrative, ...cmu.content.facts];
    for (const line of lines) {
      const normalized = normalizeInvariant(line);
      if (!normalized) continue;
      const key = `${cmu.project}:${normalized}`;
      groups.set(key, [...(groups.get(key) ?? []), cmu]);
    }
  }

  return Array.from(groups.values())
    .map(uniqueById)
    .filter((group) => group.length >= 2);
}

function buildSemanticDraft(cluster: CMU[]): SynthesisDraft {
  const sorted = [...cluster].sort((a, b) => b.metadata.importance - a.metadata.importance);
  const lead = sorted[0]!;
  const file = firstSharedFile(sorted);
  const concept = firstSharedConcept(sorted);
  const focus = file ?? concept ?? lead.content.title;
  const facts = Array.from(
    new Set(sorted.flatMap((cmu) => cmu.content.facts).filter(Boolean)),
  ).slice(0, 6);
  const filesRead = Array.from(
    new Set(sorted.flatMap((cmu) => [...cmu.content.filesRead, ...cmu.content.filesModified])),
  ).slice(0, 8);
  const concepts = Array.from(
    new Set([
      "distilled",
      "reflection",
      ...(concept ? [concept] : []),
      ...sorted.flatMap((cmu) => cmu.content.concepts.filter((item) => !item.startsWith("source:"))),
    ]),
  ).slice(0, 12);

  return {
    sessionId: lead.sessionId,
    project: lead.project,
    tier: Tier.Semantic,
    memoryType: Type.Decision,
    importance: Math.min(0.95, average(cluster.map((cmu) => cmu.metadata.importance)) + 0.15),
    associations: sorted.map((cmu) => cmu.id),
    content: {
      title: `Knowledge: ${String(focus).slice(0, 80)}`,
      narrative: `Distilled from ${sorted.length} related memories about ${focus}. ${summarizeClusterNarrative(sorted)}`,
      facts,
      concepts,
      filesRead,
      filesModified: [],
    },
  };
}

function buildProceduralDraft(cluster: CMU[]): SynthesisDraft {
  const sorted = [...cluster].sort((a, b) => b.metadata.accessCount - a.metadata.accessCount);
  const lead = sorted[0]!;
  const normalized = normalizeProcedureKey(lead.content.title) ?? lead.content.title;
  const filesModified = Array.from(new Set(sorted.flatMap((cmu) => cmu.content.filesModified))).slice(0, 8);
  const filesRead = Array.from(new Set(sorted.flatMap((cmu) => cmu.content.filesRead))).slice(0, 8);
  const concepts = Array.from(
    new Set([
      "workflow",
      "distilled",
      ...sorted.flatMap((cmu) => cmu.content.concepts.filter((item) => !item.startsWith("source:"))),
    ]),
  ).slice(0, 12);

  return {
    sessionId: lead.sessionId,
    project: lead.project,
    tier: Tier.Procedural,
    memoryType: Type.Change,
    importance: Math.min(0.98, average(cluster.map((cmu) => cmu.metadata.importance)) + 0.12),
    associations: sorted.map((cmu) => cmu.id),
    content: {
      title: `Workflow: ${normalized.slice(0, 80)}`,
      narrative: `Distilled from ${sorted.length} successful procedural memories for ${normalized}. Reuse this workflow before reconstructing it from scratch.`,
      facts: Array.from(new Set(sorted.flatMap((cmu) => cmu.content.facts).filter(Boolean))).slice(0, 5),
      concepts,
      filesRead,
      filesModified,
    },
  };
}

function buildTrajectoryDraft(cluster: CMU[]): SynthesisDraft {
  const lead = cluster[0]!;
  const steps = cluster
    .filter((cmu) => cmu.tier === Tier.Procedural || cmu.memoryType === Type.Change || cmu.content.filesModified.length > 0)
    .slice(0, 5);
  const stepTitles = steps.map((cmu) => normalizeProcedureKey(cmu.content.title) ?? cmu.content.title);
  const filesModified = Array.from(new Set(steps.flatMap((cmu) => cmu.content.filesModified))).slice(0, 8);
  const filesRead = Array.from(new Set(cluster.flatMap((cmu) => cmu.content.filesRead))).slice(0, 8);
  const concepts = Array.from(
    new Set([
      "workflow",
      "trajectory",
      "distilled",
      ...cluster.flatMap((cmu) => cmu.content.concepts.filter((item) => !item.startsWith("source:"))),
    ]),
  ).slice(0, 12);

  return {
    sessionId: lead.sessionId,
    project: lead.project,
    tier: Tier.Procedural,
    memoryType: Type.Change,
    importance: Math.min(0.99, average(cluster.map((cmu) => cmu.metadata.importance)) + 0.18),
    associations: cluster.map((cmu) => cmu.id),
    content: {
      title: `Workflow: ${stepTitles[0] ?? "session trajectory"}`,
      narrative: `Successful trajectory distilled from session ${lead.sessionId}. Typical sequence: ${stepTitles.join(" -> ")}.`,
      facts: stepTitles.slice(0, 5),
      concepts,
      filesRead,
      filesModified,
    },
  };
}

function buildInvariantDraft(cluster: CMU[]): SynthesisDraft {
  const lead = cluster[0]!;
  const invariant = normalizeInvariant([lead.content.title, lead.content.narrative, ...lead.content.facts].join(" ")) ?? lead.content.title;
  const facts = Array.from(new Set(cluster.flatMap((cmu) => cmu.content.facts).filter(Boolean))).slice(0, 6);
  const concepts = Array.from(
    new Set([
      "invariant",
      "preference",
      "constraint",
      ...cluster.flatMap((cmu) => cmu.content.concepts.filter((item) => !item.startsWith("source:"))),
    ]),
  ).slice(0, 12);

  return {
    sessionId: lead.sessionId,
    project: lead.project,
    tier: Tier.Semantic,
    memoryType: Type.Decision,
    importance: Math.min(0.99, average(cluster.map((cmu) => cmu.metadata.importance)) + 0.2),
    associations: cluster.map((cmu) => cmu.id),
    content: {
      title: `Knowledge: ${invariant.slice(0, 80)}`,
      narrative: `Stable invariant distilled from ${cluster.length} related memories. ${cluster.map((cmu) => cmu.content.narrative).filter(Boolean)[0]?.slice(0, 180) ?? ''}`.trim(),
      facts,
      concepts,
      filesRead: Array.from(new Set(cluster.flatMap((cmu) => cmu.content.filesRead))).slice(0, 8),
      filesModified: Array.from(new Set(cluster.flatMap((cmu) => cmu.content.filesModified))).slice(0, 8),
    },
  };
}

function uniqueById(cmus: CMU[]): CMU[] {
  const seen = new Set<string>();
  return cmus.filter((cmu) => {
    if (seen.has(cmu.id)) return false;
    seen.add(cmu.id);
    return true;
  });
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function firstSharedFile(cluster: CMU[]): string | undefined {
  const counts = new Map<string, number>();
  for (const cmu of cluster) {
    for (const file of new Set([...cmu.content.filesRead, ...cmu.content.filesModified])) {
      counts.set(file, (counts.get(file) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .find(([, count]) => count >= 2)?.[0];
}

function firstSharedConcept(cluster: CMU[]): string | undefined {
  const counts = new Map<string, number>();
  for (const cmu of cluster) {
    for (const concept of cmu.content.concepts.filter((item) => !item.startsWith("source:"))) {
      counts.set(concept, (counts.get(concept) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .find(([, count]) => count >= 2)?.[0];
}

function summarizeClusterNarrative(cluster: CMU[]): string {
  return cluster
    .map((cmu) => cmu.content.narrative.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item.slice(0, 140))
    .join(" ");
}

function normalizeProcedureKey(title: string): string | undefined {
  if (title.startsWith("Procedure: /")) {
    return title.replace("Procedure: /", "/");
  }

  if (title.startsWith("Tool: ")) {
    return title.replace("Tool: ", "");
  }

  return undefined;
}

function normalizeInvariant(text: string): string | undefined {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return undefined;
  const lowered = trimmed.toLowerCase();

  const invariantPhrases = [
    "do not ",
    "don't ",
    "must ",
    "should ",
    "always ",
    "never ",
    "prefer ",
    "required ",
    "constraint",
  ];

  if (!invariantPhrases.some((phrase) => lowered.includes(phrase))) {
    return undefined;
  }

  return trimmed;
}
