// ai-mem OpenCode Plugin
// Provides persistent memory with brain-inspired features for OpenCode

import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { BrainEngine, createBrainEngine } from "../engine/brain/engine";
import { parseBrainSettings } from "../config/brain-settings";
import { ClaudeMemDatabase } from "../services/sqlite/Database";
import { DB_PATH } from "../shared/paths";

type EngineState = {
  db: ClaudeMemDatabase;
  engine: BrainEngine;
};

const engineStateByDbPath = new Map<string, EngineState>();

const MEM_SEARCH = "mem-search";
const MEM_RECALL = "mem-recall";
const MEM_STATS = "mem-stats";
const MEM_CONSOLIDATE = "mem-consolidate";

const COMMAND_METADATA = {
  [MEM_SEARCH]: {
    description: "Search ai-mem memories by query",
    template: [
      "Search ai-mem memories.",
      "",
      "Arguments:",
      "- $ARGUMENTS",
    ].join("\n"),
  },
  [MEM_RECALL]: {
    description: "Recall a memory by id",
    template: [
      "Recall an ai-mem memory by id.",
      "",
      "Arguments:",
      "- $ARGUMENTS",
    ].join("\n"),
  },
  [MEM_STATS]: {
    description: "Show ai-mem memory statistics",
    template: "Show ai-mem memory statistics.",
  },
  [MEM_CONSOLIDATE]: {
    description: "Consolidate ai-mem memories",
    template: "Consolidate ai-mem memories and report the result.",
  },
} as const;

const ARG_TOKEN_REGEX = /(?:\[Image\s+\d+\]|"[^"]*"|'[^']*'|[^\s"']+)/gi;
const QUOTE_TRIM_REGEX = /^["']|["']$/g;

async function getEngine(input: PluginInput): Promise<BrainEngine> {
  const config = input.project?.settings?.["ai-mem"];
  const settings = parseBrainSettings(config);
  const stateKey = `${DB_PATH}:${JSON.stringify(settings)}`;
  const existing = engineStateByDbPath.get(stateKey);
  if (existing) {
    return existing.engine;
  }

  const db = new ClaudeMemDatabase(DB_PATH);
  const engine = createBrainEngine(db.db, settings);
  await engine.initialize();
  engineStateByDbPath.set(stateKey, { db, engine });
  return engine;
}

function tokenizeArgs(input: string): string[] {
  const raw = input.match(ARG_TOKEN_REGEX) ?? [];
  return raw.map((arg) => arg.replace(QUOTE_TRIM_REGEX, ""));
}

async function executeMemoryCommand(engine: BrainEngine, command: string, argumentsText: string): Promise<string | undefined> {
  const args = tokenizeArgs(argumentsText);

  if (command === MEM_SEARCH) {
    if (args.length === 0) {
      return `Usage: /${MEM_SEARCH} <query> [limit]`;
    }

    const last = args[args.length - 1];
    const parsedLimit = Number(last);
    const hasLimit = Number.isFinite(parsedLimit) && parsedLimit > 0;
    const limit = hasLimit ? Math.floor(parsedLimit) : 10;
    const query = hasLimit ? args.slice(0, -1).join(" ") : args.join(" ");

    if (!query.trim()) {
      return `Usage: /${MEM_SEARCH} <query> [limit]`;
    }

    const results = await engine.retrieveMemories(query, {}, limit);
    if (results.length === 0) {
      return "No memories found";
    }

    return results
      .map((result) =>
        [
          `[${result.cmu.tier}] ${result.cmu.content.title}`,
          `ID: ${result.cmu.id}`,
          `Activation: ${result.activation.toFixed(2)}`,
          result.cmu.content.narrative,
        ].join("\n"),
      )
      .join("\n\n---\n\n");
  }

  if (command === MEM_RECALL) {
    const memoryId = args[0];
    if (!memoryId) {
      return `Usage: /${MEM_RECALL} <memory-id>`;
    }

    const memory = await engine.getMemoryById(memoryId);
    if (!memory) {
      return "Memory not found";
    }

    await engine.recordAccess(memoryId);
    return [
      `[${memory.tier}] ${memory.content.title}`,
      `ID: ${memory.id}`,
      `Importance: ${memory.metadata.importance.toFixed(2)}`,
      memory.content.narrative,
    ].join("\n");
  }

  if (command === MEM_STATS) {
    const stats = await engine.getStats();
    return [
      "Memory Statistics",
      `Total memories: ${stats.total}`,
      `Average activation: ${stats.avgActivation.toFixed(2)}`,
      "",
      "By tier:",
      ...Object.entries(stats.byTier).map(([tier, count]) => `- ${tier}: ${count}`),
    ].join("\n");
  }

  if (command === MEM_CONSOLIDATE) {
    const result = await engine.consolidate();
    return [
      "Consolidation complete",
      `Merged: ${result.merged}`,
      `Pruned: ${result.pruned}`,
      `Linked: ${result.linked}`,
    ].join("\n");
  }

  return undefined;
}

function formatStatsOutput(stats: Awaited<ReturnType<BrainEngine["getStats"]>>): string {
  return [
    "Memory Statistics",
    `Total memories: ${stats.total}`,
    `Average activation: ${stats.avgActivation.toFixed(2)}`,
    "",
    "By tier:",
    ...Object.entries(stats.byTier).map(([tier, count]) => `- ${tier}: ${count}`),
  ].join("\n");
}

export const AiMemPlugin: Plugin = async (input: PluginInput) => {
  const engine = await getEngine(input);

  return {
    config: async (config) => {
      config.command = config.command ?? {};
      for (const [name, metadata] of Object.entries(COMMAND_METADATA)) {
        if (config.command[name]) continue;
        config.command[name] = {
          description: metadata.description,
          template: metadata.template,
        };
      }
    },

    tool: {
      [MEM_SEARCH]: tool({
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

          if (results.length === 0) {
            return "No memories found";
          }

          return results
            .map((r) =>
              [
                `[${r.cmu.tier}] ${r.cmu.content.title}`,
                `ID: ${r.cmu.id}`,
                `Importance: ${r.cmu.metadata.importance.toFixed(2)}`,
                `Activation: ${r.activation.toFixed(2)}`,
                r.cmu.content.narrative,
              ].join("\n"),
            )
            .join("\n\n---\n\n");
        },
      }),

      [MEM_RECALL]: tool({
        description: "Recall specific memories by ID and record access for activation boost",
        args: {
          memoryId: tool.schema.string().describe("Memory ID to recall"),
        },
        async execute(args) {
          const memory = await engine.getMemoryById(args.memoryId);
          if (!memory) {
            return "Memory not found";
          }

          await engine.recordAccess(args.memoryId);
          return [
            `[${memory.tier}] ${memory.content.title}`,
            `ID: ${memory.id}`,
            `Importance: ${memory.metadata.importance.toFixed(2)}`,
            memory.content.narrative,
          ].join("\n");
        },
      }),

      [MEM_STATS]: tool({
        description: "Get memory statistics by tier and activation",
        args: {},
        async execute() {
          const stats = await engine.getStats();
          return formatStatsOutput(stats);
        },
      }),

      [MEM_CONSOLIDATE]: tool({
        description: "Trigger memory consolidation (deduplication, linking, pruning)",
        args: {},
        async execute() {
          const result = await engine.consolidate();
          return [
            "Consolidation complete",
            `Merged: ${result.merged}`,
            `Pruned: ${result.pruned}`,
            `Linked: ${result.linked}`,
          ].join("\n");
        },
      }),
    },

    "command.execute.before": async (commandInput, output) => {
      const result = await executeMemoryCommand(engine, commandInput.command, commandInput.arguments);
      if (!result) return;
      output.parts = [
        {
          type: "text",
          text: `Return exactly this output and nothing else:\n\n${result}`,
        } as any,
      ];
    },

    "chat.message": async (_input, output) => {
      const query = output.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")
        .trim();

      if (!query) return;

      const results = await engine.retrieveMemories(
        query,
        {},
        10
      );

      if (results.length > 0) {
        const context = results
          .slice(0, 5)
          .map((r) => `[${r.cmu.tier}] ${r.cmu.content.title}: ${r.cmu.content.narrative.substring(0, 200)}`)
          .join("\n\n");

        output.parts.push({
          id: crypto.randomUUID(),
          sessionID: output.message.sessionID,
          messageID: output.message.id,
          type: "text",
          text: `Relevant memories:\n${context}`,
          synthetic: true,
        } as never);
      }
    },

    "tool.execute.after": async (
      input: { tool: string; args: Record<string, unknown> },
      output
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

    "experimental.session.compacting": async (_input, output) => {
      const results = await engine.retrieveMemories("", {}, 100);
      const memories = results.map((r) => r.cmu).slice(0, 50);
      if (memories.length === 0) return;

      const lines = memories.map((memory) =>
        [
          `[${memory.tier}] ${memory.content.title}`,
          memory.content.narrative,
        ].join("\n"),
      );

      output.context.push(`Relevant ai-mem memories:\n\n${lines.join("\n\n---\n\n")}`);
    },
  };
};

export default AiMemPlugin;
