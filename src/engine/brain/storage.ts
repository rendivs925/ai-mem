// Storage backend interface for brain engine

import type { CMU } from "../../types/brain/memory";

export interface StorageBackend {
  getAllMemories(): Promise<CMU[]>;
  getMemoryById(id: string): Promise<CMU | null>;
  updateActivation(id: string, activation: number): Promise<void>;
  updateLastAccessed(id: string, timestamp: number): Promise<void>;
  incrementAccessCount(id: string): Promise<void>;
  deleteMemory(id: string): Promise<void>;
}
