// Background Decay Worker
// Applies Ebbinghaus forgetting curve to memories

import type { CMU, CMUMetadata } from "../../types/brain/memory";
import { calculateBaseActivation, calculateRetentionScore } from "./activation";
import type { StorageBackend } from "./storage";

const DEFAULT_DECAY_PARAMETER = 0.5;
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

export interface DecayWorkerConfig {
  decayParameter?: number;
  threshold?: number;
  intervalMs?: number;
}

export class DecayWorker {
  private config: Required<DecayWorkerConfig>;
  private intervalId?: ReturnType<typeof setInterval>;
  private isRunning = false;

  constructor(config: DecayWorkerConfig = {}) {
    this.config = {
      decayParameter: config.decayParameter ?? DEFAULT_DECAY_PARAMETER,
      threshold: config.threshold ?? 0.1,
      intervalMs: config.intervalMs ?? DEFAULT_INTERVAL_MS,
    };
  }

  async start(backend: StorageBackend): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    this.intervalId = setInterval(async () => {
      try {
        await this.runDecayCycle(backend);
      } catch (error) {
        console.error("Decay worker error:", error);
      }
    }, this.config.intervalMs);

    await this.runDecayCycle(backend);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
  }

  private async runDecayCycle(backend: StorageBackend): Promise<void> {
    const memories = await backend.getAllMemories();

    for (const memory of memories) {
      const newActivation = calculateBaseActivation(
        memory.metadata.accessCount,
        memory.metadata.lastAccessed,
        this.config.decayParameter
      );

      if (newActivation !== memory.metadata.baseActivation) {
        await backend.updateActivation(memory.id, newActivation);
      }
    }
  }
}

export function createDecayWorker(config?: DecayWorkerConfig): DecayWorker {
  return new DecayWorker(config);
}
