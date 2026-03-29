// Sleep Consolidation Cycle
// Based on research: Sleep cycle for memory linking and pruning

import type { CMU } from "../../../../types/brain/memory";
import { MemoryGraph } from "../graph";
import { findDuplicates } from "./dedupe";
import { pruneByImportance, pruneByAge } from "./cull";
import { PruningError } from "../../../../types/brain/error";

export interface ConsolidationResult {
  merged: number;
  pruned: number;
  linked: number;
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

    for (const dup of duplicates) {
      toRemove.add(dup.remove.id);
      merged++;
    }

    linked = linkRelatedMemories(cmus, graph);

    const remaining = cmus.filter((cmu) => !toRemove.has(cmu.id));

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
    pruned += remaining.length - agedPruned.length;

    return { merged, pruned, linked };
  } catch (error) {
    throw new PruningError(
      `Consolidation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
  }
}

function linkRelatedMemories(cmus: CMU[], graph: MemoryGraph): number {
  let links = 0;

  for (let i = 0; i < cmus.length; i++) {
    for (const concept of cmus[i].content.concepts) {
      for (let j = i + 1; j < cmus.length; j++) {
        if (cmus[j].content.concepts.includes(concept)) {
          if (!cmus[i].associations.includes(cmus[j].id)) {
            graph.addAssociation(cmus[i].id, cmus[j].id, 0.5);
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
              links++;
            }
          }
        }
      }
    }
  }

  return links;
}
