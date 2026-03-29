// ai-mem OpenCode Plugin
// Provides persistent memory with brain-inspired features for OpenCode

import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { BrainEngine, createBrainEngine } from "../engine/brain/engine";
import { parseBrainSettings, defaultBrainSettings } from "../config/brain-settings";

let brainEngine: BrainEngine | null = null;

async function getEngine(input: PluginInput): Promise<BrainEngine> {
  if (!brainEngine) {
    const config = input.project?.settings?.["ai-mem"];
    const settings = parseBrainSettings(config);
    brainEngine = createBrainEngine(
      {} as never,
      settings
    );
    await brainEngine.initialize();
  }
  return brainEngine;
}

export const AiMemPlugin: Plugin = async (input: PluginInput) => {
  const engine = await getEngine(input);

  return {
    tool: {
      "mem-search": tool({
        description: "Search memories using brain-inspired retrieval with ACT-R activation",
        args: {
          query: tool.schema.string().describe("Search query"),
          limit: tool.schema.number().optional().describe("Max results (default: 50)"),
          tiers: tool.schema.array(tool.schema.string()).optional().describe("Filter by memory tiers"),
        },
        async execute(args) {
          const results = await engine.retrieveMemories(
            args.query,
            {
              tiers: args.tiers as never,
            },
            args.limit || 50
          );

          return {
            results: results.map((r) => ({
              id: r.cmu.id,
              title: r.cmu.content.title,
              narrative: r.cmu.content.narrative,
              tier: r.cmu.tier,
              importance: r.cmu.metadata.importance,
              activation: r.activation,
              source: r.source,
            })),
            total: results.length,
          };
        },
      }),

      "mem-recall": tool({
        description: "Recall specific memories by ID and record access for activation boost",
        args: {
          memoryId: tool.schema.string().describe("Memory ID to recall"),
        },
        async execute(args) {
          await engine.recordAccess(args.memoryId);
          return { success: true, message: "Memory access recorded" };
        },
      }),

      "mem-stats": tool({
        description: "Get memory statistics by tier and activation",
        args: {},
        async execute() {
          const stats = await engine.getStats();
          return stats;
        },
      }),

      "mem-consolidate": tool({
        description: "Trigger memory consolidation (deduplication, linking, pruning)",
        args: {},
        async execute() {
          const result = await engine.consolidate();
          return {
            success: true,
            merged: result.merged,
            pruned: result.pruned,
            linked: result.linked,
          };
        },
      }),
    },

    "chat.message": async (input: { message: string }, output: { message: string }) => {
      const results = await engine.retrieveMemories(
        output.message,
        {},
        10
      );

      if (results.length > 0) {
        const context = results
          .slice(0, 5)
          .map((r) => `[${r.cmu.tier}] ${r.cmu.content.title}: ${r.cmu.content.narrative.substring(0, 200)}`)
          .join("\n\n");

        return {
          injected: true,
          context: `\n\nRelevant memories:\n${context}\n`,
        };
      }

      return { injected: false };
    },

    "tool.execute.after": async (
      input: { tool: string; args: Record<string, unknown> },
      output: { output: string }
    ) => {
      const project = "default";

      if (output.output && output.output.length > 100) {
        await engine.captureMemory(
          crypto.randomUUID(),
          project,
          {
            title: `Tool: ${input.tool}`,
            narrative: output.output.substring(0, 2000),
            facts: [],
            concepts: [input.tool],
            filesRead: [],
            filesModified: [],
          },
          "discovery",
          0.5
        );
      }
    },

    "experimental.session.compacting": async (input: unknown, output: { context: string }) => {
      const results = await engine.retrieveMemories("", {}, 100);
      const memories = results.map((r) => r.cmu).slice(0, 50);

      return {
        memories,
        count: memories.length,
      };
    },
  };
};

export default AiMemPlugin;
