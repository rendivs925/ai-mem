// Brain-inspired memory types based on research
// AGENTS.md: Use enums, not strings

export enum MemoryTier {
  Sensory = "sensory",
  Working = "working",
  Episodic = "episodic",
  Semantic = "semantic",
  Procedural = "procedural",
}

export enum MemoryType {
  Bugfix = "bugfix",
  Feature = "feature",
  Decision = "decision",
  Discovery = "discovery",
  Refactor = "refactor",
  Change = "change",
}

export enum EmotionalTag {
  Frustration = "frustration",
  Breakthrough = "breakthrough",
  Learning = "learning",
  Confusion = "confusion",
  Satisfaction = "satisfaction",
}

export interface CMU {
  id: string;
  sessionId: string;
  project: string;
  tier: MemoryTier;
  memoryType: MemoryType;
  content: MemoryContent;
  metadata: CMUMetadata;
  tags: EmotionalTag[];
  associations: string[];
}

export interface MemoryContent {
  title: string;
  narrative: string;
  facts: string[];
  concepts: string[];
  filesRead: string[];
  filesModified: string[];
  rawOutput?: string;
}

export interface CMUMetadata {
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  importance: number;
  baseActivation: number;
  decayRate: number;
}

export interface SearchFilters {
  tiers?: MemoryTier[];
  types?: MemoryType[];
  projects?: string[];
  minImportance?: number;
  since?: number;
}

export interface RetrievalResult {
  cmu: CMU;
  score: number;
  activation: number;
  source: "fts5" | "vector" | "spreading";
}

export interface ActivationConfig {
  decayParameter: number;
  activationThreshold: number;
}

export interface TierConfig {
  decay: number;
  maxCount: number;
}

export interface PruningConfig {
  dedupeSimilarity: number;
  importanceThreshold: number;
  consolidateOnIdleMinutes: number;
}

export interface MemoryGraph {
  nodes: Map<string, MemoryNode>;
  edges: Map<string, Association[]>;
}

export interface MemoryNode {
  id: string;
  cmu: CMU;
  activation: number;
}

export interface Association {
  targetId: string;
  strength: number;
}
