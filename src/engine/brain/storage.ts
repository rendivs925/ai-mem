// Storage backend interface for brain engine

import type { CMU, SearchFilters, MemoryTier } from "../../types/brain/memory";

export interface StorageBackend {
  getAllMemories(): Promise<CMU[]>;
  getSyncToken(): Promise<string>;
  getMemoryById(id: string): Promise<CMU | null>;
  getMemoriesByProject(project: string): Promise<CMU[]>;
  getMemoriesByTier(tier: MemoryTier): Promise<CMU[]>;
  updateActivation(id: string, activation: number): Promise<void>;
  updateAssociations(id: string, associations: string[]): Promise<void>;
  updateLastAccessed(id: string, timestamp: number): Promise<void>;
  incrementAccessCount(id: string): Promise<void>;
  deleteMemory(id: string): Promise<void>;
  storeMemory(cmu: CMU): Promise<string>;
  searchByKeywords(keywords: string[], limit?: number): Promise<CMU[]>;
}
