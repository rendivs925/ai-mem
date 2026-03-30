// Typed errors based on AGENTS.md
// Single log point per operation

export class MemoryError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message);
    this.name = "MemoryError";
  }
}

export class CompressionError extends MemoryError {
  constructor(message: string, cause?: unknown) {
    super(`Compression failed: ${message}`, cause);
    this.name = "CompressionError";
  }
}

export class RetrievalError extends MemoryError {
  constructor(message: string, cause?: unknown) {
    super(`Retrieval failed: ${message}`, cause);
    this.name = "RetrievalError";
  }
}

export class ActivationError extends MemoryError {
  constructor(message: string, cause?: unknown) {
    super(`Activation calculation failed: ${message}`, cause);
    this.name = "ActivationError";
  }
}

export class PruningError extends MemoryError {
  constructor(message: string, cause?: unknown) {
    super(`Pruning failed: ${message}`, cause);
    this.name = "PruningError";
  }
}

export class StorageError extends MemoryError {
  constructor(message: string, cause?: unknown) {
    super(`Storage error: ${message}`, cause);
    this.name = "StorageError";
  }
}
