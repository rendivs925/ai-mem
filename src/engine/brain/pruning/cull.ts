// Importance-based memory culling
// Based on research: Remove low-importance memories when cap exceeded

import type { CMU, CMUMetadata } from "../../../types/brain/memory";
import { calculateRetentionScore } from "../activation";

export interface PruneCandidate {
  cmu: CMU;
  retentionScore: number;
}

export function calculatePruneCandidates(
  cmus: CMU[],
  threshold: number,
  decayParameter: number = 0.5
): PruneCandidate[] {
  const candidates: PruneCandidate[] = [];

  for (const cmu of cmus) {
    const retentionScore = calculateRetentionScore(cmu.metadata);
    if (retentionScore < threshold) {
      candidates.push({ cmu, retentionScore });
    }
  }

  return candidates.sort((a, b) => a.retentionScore - b.retentionScore);
}

export function pruneByImportance(
  cmus: CMU[],
  maxCount: number,
  importanceThreshold: number,
  decayParameter: number = 0.5
): CMU[] {
  if (cmus.length <= maxCount) {
    return cmus;
  }

  const candidates = calculatePruneCandidates(cmus, importanceThreshold, decayParameter);
  const toRemove = new Set(candidates.map((c) => c.cmu.id));

  return cmus.filter((cmu) => !toRemove.has(cmu.id)).slice(0, maxCount);
}

export function pruneByAge(
  cmus: CMU[],
  maxAgeDays: number
): CMU[] {
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return cmus.filter((cmu) => {
    const age = now - cmu.metadata.createdAt;
    if (cmu.metadata.importance >= 0.7) return true;
    return age < maxAgeMs;
  });
}

export function shouldPrune(
  metadata: CMUMetadata,
  threshold: number,
  decayParameter: number = 0.5
): boolean {
  const retentionScore = calculateRetentionScore(metadata);
  return retentionScore < threshold;
}
