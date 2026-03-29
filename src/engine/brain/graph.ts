// Memory Graph with Spreading Activation
// Based on research: A_j = B_j + Σ(W_ij * S_i)

import type { CMU, MemoryNode, Association } from "../../types/brain/memory";

export class MemoryGraph {
  private nodes: Map<string, MemoryNode> = new Map();
  private edges: Map<string, Association[]> = new Map();

  addNode(cmu: CMU): void {
    this.nodes.set(cmu.id, {
      id: cmu.id,
      cmu,
      activation: cmu.metadata.baseActivation,
    });
  }

  addAssociation(fromId: string, toId: string, strength: number): void {
    const existing = this.edges.get(fromId) || [];
    existing.push({ targetId: toId, strength });
    this.edges.set(fromId, existing);

    const reverse = this.edges.get(toId) || [];
    reverse.push({ targetId: fromId, strength: strength * 0.5 });
    this.edges.set(toId, reverse);
  }

  getNode(id: string): MemoryNode | undefined {
    return this.nodes.get(id);
  }

  getAssociations(id: string): Association[] {
    return this.edges.get(id) || [];
  }

  retrieveContext(seedIds: string[], iterations: number = 3): string[] {
    const activations: Map<string, number> = new Map();

    for (const seedId of seedIds) {
      const node = this.nodes.get(seedId);
      if (node) {
        activations.set(seedId, 1.0);
      }
    }

    for (let i = 0; i < iterations; i++) {
      const nextGen: Map<string, number> = new Map();

      for (const [id, score] of activations) {
        const associations = this.edges.get(id) || [];
        const outgoingCount = associations.length;

        if (outgoingCount === 0) continue;

        for (const assoc of associations) {
          const spread = (score * assoc.strength) / Math.sqrt(outgoingCount);
          const current = nextGen.get(assoc.targetId) || 0;
          nextGen.set(assoc.targetId, current + spread);
        }
      }

      for (const [id, score] of nextGen) {
        const existing = activations.get(id) || 0;
        activations.set(id, existing + score);
      }
    }

    const results: Array<{ id: string; score: number }> = [];
    for (const [id, score] of activations) {
      const node = this.nodes.get(id);
      if (node) {
        results.push({
          id,
          score: score + node.activation,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.map((r) => r.id);
  }

  getAllNodes(): MemoryNode[] {
    return Array.from(this.nodes.values());
  }

  size(): number {
    return this.nodes.size;
  }
}
