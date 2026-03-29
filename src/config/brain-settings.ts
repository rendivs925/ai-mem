// Brain-inspired memory configuration
// Simple validation without external dependencies

import { MemoryTier } from "../types/brain/memory";

export interface TierConfig {
  decay: number;
  maxCount: number;
}

export interface ActRConfig {
  decayParameter: number;
  activationThreshold: number;
}

export interface PruningConfig {
  dedupeSimilarity: number;
  importanceThreshold: number;
  consolidateOnIdleMinutes: number;
  maxAgeDays: number;
}

export interface VectorDbConfig {
  provider: "none" | "qdrant" | "chroma";
  url?: string;
  collectionName: string;
}

export interface BrainSettings {
  enabled: boolean;
  observations: number;
  sessions: number;
  tiers: Record<MemoryTier, TierConfig>;
  actr: ActRConfig;
  pruning: PruningConfig;
  vectorDb: VectorDbConfig;
}

export const defaultBrainSettings: BrainSettings = {
  enabled: true,
  observations: 50,
  sessions: 10,
  tiers: {
    [MemoryTier.Sensory]: { decay: 0.9, maxCount: 100 },
    [MemoryTier.Working]: { decay: 0.5, maxCount: 50 },
    [MemoryTier.Episodic]: { decay: 0.3, maxCount: 1000 },
    [MemoryTier.Semantic]: { decay: 0.1, maxCount: 10000 },
    [MemoryTier.Procedural]: { decay: 0.2, maxCount: 500 },
  },
  actr: {
    decayParameter: 0.5,
    activationThreshold: 0.1,
  },
  pruning: {
    dedupeSimilarity: 0.95,
    importanceThreshold: 0.2,
    consolidateOnIdleMinutes: 15,
    maxAgeDays: 30,
  },
  vectorDb: {
    provider: "none",
    collectionName: "ai-mem",
  },
};

function isValidTier(value: string): value is MemoryTier {
  return Object.values(MemoryTier).includes(value as MemoryTier);
}

function isValidProvider(value: string): value is "none" | "qdrant" | "chroma" {
  return ["none", "qdrant", "chroma"].includes(value);
}

export function parseBrainSettings(input: unknown): BrainSettings {
  if (input === undefined || input === null) {
    return defaultBrainSettings;
  }

  if (typeof input !== "object") {
    console.warn("Invalid brain settings, using defaults");
    return defaultBrainSettings;
  }

  const obj = input as Record<string, unknown>;

  const settings: BrainSettings = {
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : defaultBrainSettings.enabled,
    observations: typeof obj.observations === "number" 
      ? Math.min(200, Math.max(1, obj.observations)) 
      : defaultBrainSettings.observations,
    sessions: typeof obj.sessions === "number" 
      ? Math.min(50, Math.max(1, obj.sessions)) 
      : defaultBrainSettings.sessions,
    tiers: defaultBrainSettings.tiers,
    actr: defaultBrainSettings.actr,
    pruning: defaultBrainSettings.pruning,
    vectorDb: defaultBrainSettings.vectorDb,
  };

  if (obj.tiers && typeof obj.tiers === "object") {
    const tiersObj = obj.tiers as Record<string, unknown>;
    for (const [key, value] of Object.entries(tiersObj)) {
      if (isValidTier(key) && value && typeof value === "object") {
        const tierVal = value as Record<string, unknown>;
        settings.tiers[key] = {
          decay: typeof tierVal.decay === "number" ? Math.min(1, Math.max(0, tierVal.decay)) : defaultBrainSettings.tiers[key].decay,
          maxCount: typeof tierVal.maxCount === "number" ? Math.max(1, tierVal.maxCount) : defaultBrainSettings.tiers[key].maxCount,
        };
      }
    }
  }

  if (obj.actr && typeof obj.actr === "object") {
    const actrObj = obj.actr as Record<string, unknown>;
    settings.actr = {
      decayParameter: typeof actrObj.decayParameter === "number" 
        ? Math.min(1, Math.max(0, actrObj.decayParameter)) 
        : defaultBrainSettings.actr.decayParameter,
      activationThreshold: typeof actrObj.activationThreshold === "number" 
        ? Math.max(0, actrObj.activationThreshold) 
        : defaultBrainSettings.actr.activationThreshold,
    };
  }

  if (obj.pruning && typeof obj.pruning === "object") {
    const pruneObj = obj.pruning as Record<string, unknown>;
    settings.pruning = {
      dedupeSimilarity: typeof pruneObj.dedupeSimilarity === "number" 
        ? Math.min(1, Math.max(0, pruneObj.dedupeSimilarity)) 
        : defaultBrainSettings.pruning.dedupeSimilarity,
      importanceThreshold: typeof pruneObj.importanceThreshold === "number" 
        ? Math.min(1, Math.max(0, pruneObj.importanceThreshold)) 
        : defaultBrainSettings.pruning.importanceThreshold,
      consolidateOnIdleMinutes: typeof pruneObj.consolidateOnIdleMinutes === "number" 
        ? Math.max(1, pruneObj.consolidateOnIdleMinutes) 
        : defaultBrainSettings.pruning.consolidateOnIdleMinutes,
      maxAgeDays: typeof pruneObj.maxAgeDays === "number" 
        ? Math.max(1, pruneObj.maxAgeDays) 
        : defaultBrainSettings.pruning.maxAgeDays,
    };
  }

  if (obj.vectorDb && typeof obj.vectorDb === "object") {
    const vecObj = obj.vectorDb as Record<string, unknown>;
    settings.vectorDb = {
      provider: isValidProvider(vecObj.provider as string) ? (vecObj.provider as "none" | "qdrant" | "chroma") : defaultBrainSettings.vectorDb.provider,
      url: typeof vecObj.url === "string" ? vecObj.url : defaultBrainSettings.vectorDb.url,
      collectionName: typeof vecObj.collectionName === "string" ? vecObj.collectionName : defaultBrainSettings.vectorDb.collectionName,
    };
  }

  return settings;
}
