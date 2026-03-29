// ACT-R Base-Level Activation calculations
// Based on research: B = ln(Σ(t_i^-d))
// AGENTS.md: Pure functions, no unwrap/panic

import type { CMUMetadata } from "../../types/brain/memory";

const DEFAULT_DECAY_PARAMETER = 0.5;
const MIN_ACCESS_COUNT = 1;
const MIN_ELAPSED_MS = 1000;

export function calculateBaseActivation(
  accessCount: number,
  lastAccessed: number,
  decayParameter: number = DEFAULT_DECAY_PARAMETER
): number {
  if (accessCount < MIN_ACCESS_COUNT) {
    return 0;
  }

  const now = Date.now();
  const elapsedSeconds = Math.max(now - lastAccessed, MIN_ELAPSED_MS) / 1000;

  const sum = accessCount * Math.pow(elapsedSeconds, -decayParameter);

  return Math.log(sum);
}

export function calculateRetentionScore(metadata: CMUMetadata): number {
  const { baseActivation, importance, accessCount } = metadata;
  const frequency = Math.log(Math.max(accessCount, 1)) / Math.LN2;
  return baseActivation * importance * frequency;
}

export function shouldDecay(
  metadata: CMUMetadata,
  threshold: number,
  decayParameter: number = DEFAULT_DECAY_PARAMETER
): boolean {
  const newActivation = calculateBaseActivation(
    metadata.accessCount,
    metadata.lastAccessed,
    decayParameter
  );

  const retentionScore = calculateRetentionScore({
    ...metadata,
    baseActivation: newActivation,
  });

  return retentionScore < threshold;
}

export function getDefaultDecayRate(tier: string): number {
  const decayRates: Record<string, number> = {
    sensory: 0.9,
    working: 0.5,
    episodic: 0.3,
    semantic: 0.1,
    procedural: 0.2,
  };
  return decayRates[tier] ?? 0.5;
}
