// ai-mem OpenCode Plugin
// Provides persistent memory with brain-inspired features for OpenCode

import type { Hooks, Plugin, PluginInput } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { BrainEngine, createBrainEngine } from "../engine/brain/engine";
import { defaultBrainSettings, parseBrainSettings, type BrainSettings } from "../config/brain-settings";
import { AiMemDatabase } from "../services/sqlite/Database";
import { DB_PATH } from "../shared/paths";
import { getProjectContext } from "../utils/project-name";

type EngineState = {
  db: AiMemDatabase;
  engine: BrainEngine;
};

const engineStateByDbPath = new Map<string, EngineState>();

const MEM_SEARCH = "mem-search";
const MEM_RECALL = "mem-recall";
const MEM_STATS = "mem-stats";
const MEM_CONSOLIDATE = "mem-consolidate";
const MEM_REBUILD = "mem-rebuild";

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
  [MEM_REBUILD]: {
    description: "Rebuild ai-mem memory quality from stored memories",
    template: "Rebuild ai-mem memory quality and report the result.",
  },
} as const;

const ARG_TOKEN_REGEX = /(?:\[Image\s+\d+\]|"[^"]*"|'[^']*'|[^\s"']+)/gi;
const QUOTE_TRIM_REGEX = /^["']|["']$/g;
const NOISY_TOOLS = new Set(["read", "glob", "grep", "search", "find", "ls", "list", "view"]);
const HIGH_SIGNAL_PATTERN =
  /\b(decision|because|fix|fixed|error|failed|failure|root cause|summary|plan|architecture|workflow|remember)\b/i;

async function getEngine(settings: BrainSettings): Promise<BrainEngine> {
  const stateKey = `${DB_PATH}:${JSON.stringify(settings)}`;
  const existing = engineStateByDbPath.get(stateKey);
  if (existing) {
    return existing.engine;
  }

  const db = new AiMemDatabase(DB_PATH);
  const engine = createBrainEngine(db.db, settings);
  await engine.initialize();
  engineStateByDbPath.set(stateKey, { db, engine });
  return engine;
}

function tokenizeArgs(input: string): string[] {
  const raw = input.match(ARG_TOKEN_REGEX) ?? [];
  return raw.map((arg) => arg.replace(QUOTE_TRIM_REGEX, ""));
}

function projectContext(input: PluginInput) {
  return getProjectContext(input.project.worktree);
}

function projectName(input: PluginInput): string {
  return projectContext(input).canonical;
}

function projectAliases(input: PluginInput): string[] {
  const context = projectContext(input);
  return context.allProjects;
}

function toolKind(name: string): "change" | "discovery" {
  return name.includes("edit") || name.includes("write") ? "change" : "discovery";
}

function shouldCaptureToolOutput(toolName: string, output: string, files: string[]): boolean {
  const trimmed = output.trim();
  if (trimmed.length < 40) return false;

  if (toolKind(toolName) === "change") return true;
  if (NOISY_TOOLS.has(toolName)) return false;
  if (files.length > 0 && trimmed.length >= 80) return true;

  return HIGH_SIGNAL_PATTERN.test(trimmed);
}

function extractConcepts(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9_.-]+/)
        .filter((token) => token.length >= 4),
    ),
  ).slice(0, 12);
}

function withSourceConcepts(source: string, values: string[]): string[] {
  return Array.from(new Set([`source:${source}`, ...values])).slice(0, 12);
}

function summarizeTitle(text: string, fallback: string): string {
  const line = text.split("\n").map((item) => item.trim()).find(Boolean);
  return (line || fallback).slice(0, 80);
}

async function captureCommandMemory(
  engine: BrainEngine,
  pluginInput: PluginInput,
  sessionID: string,
  name: string,
  argumentsText: string,
): Promise<void> {
  if (name.startsWith("mem-")) return;

  const combined = `${name} ${argumentsText}`.trim();
  await engine.captureMemory(
    sessionID,
    projectName(pluginInput),
    {
      title: `Procedure: /${name}`,
      narrative: combined.slice(0, 2000),
      facts: argumentsText ? [argumentsText.slice(0, 300)] : [],
      concepts: withSourceConcepts("opencode", [name, ...extractConcepts(combined)]),
      filesRead: [],
      filesModified: [],
    },
    "change",
    0.7,
  );
}

async function maybeConsolidate(engine: BrainEngine): Promise<void> {
  await engine.consolidate();
}

async function captureUserPromptMemory(
  engine: BrainEngine,
  pluginInput: PluginInput,
  output: { message: { sessionID: string }; parts: Array<{ type: string; text?: string; source?: { path?: string } }> },
): Promise<void> {
  const text = output.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("\n")
    .trim();

  if (!text || text.length < 24) return;

  const filesRead = output.parts
    .filter((part) => part.type === "file")
    .map((part) => part.source?.path)
    .filter((value): value is string => Boolean(value));

  await engine.captureMemory(
    output.message.sessionID,
    projectName(pluginInput),
    {
      title: summarizeTitle(text, "User prompt"),
      narrative: text.slice(0, 2000),
      facts: [],
      concepts: withSourceConcepts("opencode", extractConcepts(text)),
      filesRead,
      filesModified: [],
    },
    "discovery",
    filesRead.length > 0 ? 0.75 : 0.55,
  );
}

function formatRelevantMemoryContext(results: Awaited<ReturnType<BrainEngine["retrieveMemories"]>>): string {
  return [
    "Established project memory:",
    "Use this as prior context and avoid asking for the same background again unless the user is correcting it.",
    "",
    ...results.slice(0, 5).map((result) =>
      `- [${result.cmu.tier}] ${result.cmu.content.title}: ${result.cmu.content.narrative.slice(0, 220)}`,
    ),
  ].join("\n");
}

async function executeMemoryCommand(
  engine: BrainEngine,
  command: string,
  argumentsText: string,
  projects: string[],
): Promise<string | undefined> {
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

    const results = await engine.retrieveMemories(query, { projects }, limit);
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

  if (command === MEM_REBUILD) {
    const result = await engine.consolidate();
    return [
      "Memory quality rebuild complete",
      `Merged: ${result.merged}`,
      `Pruned: ${result.pruned}`,
      `Linked: ${result.linked}`,
      "Existing memories were re-evaluated and distilled memories were refreshed.",
    ].join("\n");
  }

  return undefined;
}

function formatStatsOutput(stats: Awaited<ReturnType<BrainEngine["getStats"]>>): string {
  const qualityRatio = stats.total > 0 ? ((stats.committed / stats.total) * 100).toFixed(1) : "0.0";
  const evidenceRatio = stats.total > 0 ? ((stats.evidence / stats.total) * 100).toFixed(1) : "0.0";
  return [
    "Memory Statistics",
    `Total memories: ${stats.total}`,
    `Average activation: ${stats.avgActivation.toFixed(2)}`,
    `Committed memory: ${stats.committed} (${qualityRatio}%)`,
    `Sensory evidence: ${stats.evidence} (${evidenceRatio}%)`,
    `Distilled memories: ${stats.distilled}`,
    "",
    "By tier:",
    ...Object.entries(stats.byTier).map(([tier, count]) => `- ${tier}: ${count}`),
    "",
    "Top signals:",
    ...(stats.topSignals.length > 0 ? stats.topSignals.map((signal) => `- ${signal}`) : ["- none"]),
  ].join("\n");
}

export const AiMemPlugin: Plugin = async (pluginInput: PluginInput) => {
  const projects = projectAliases(pluginInput);
  let currentSettings = defaultBrainSettings;

  const resolveEngine = async () => getEngine(currentSettings);

  const resolveHooks = (): Hooks => ({
    config: async (config) => {
      const nextSettings = parseBrainSettings((config as Record<string, unknown>)["ai-mem"]);
      currentSettings = nextSettings;

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
          const engine = await resolveEngine();
          const results = await engine.retrieveMemories(
            args.query,
            {
              projects,
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
          const engine = await resolveEngine();
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
          const engine = await resolveEngine();
          const stats = await engine.getStats();
          return formatStatsOutput(stats);
        },
      }),

      [MEM_CONSOLIDATE]: tool({
        description: "Trigger memory consolidation (deduplication, linking, pruning)",
        args: {},
        async execute() {
          const engine = await resolveEngine();
          const result = await engine.consolidate();
          return [
            "Consolidation complete",
            `Merged: ${result.merged}`,
            `Pruned: ${result.pruned}`,
            `Linked: ${result.linked}`,
          ].join("\n");
        },
      }),

      [MEM_REBUILD]: tool({
        description: "Rebuild memory quality by re-running consolidation against stored memories",
        args: {},
        async execute() {
          const engine = await resolveEngine();
          const result = await engine.consolidate();
          return [
            "Memory quality rebuild complete",
            `Merged: ${result.merged}`,
            `Pruned: ${result.pruned}`,
            `Linked: ${result.linked}`,
            "Existing memories were re-evaluated and distilled memories were refreshed.",
          ].join("\n");
        },
      }),
    },

    "command.execute.before": async (commandInput, output) => {
      const engine = await resolveEngine();
      const result = await executeMemoryCommand(engine, commandInput.command, commandInput.arguments, projects);
      if (!result) return;
      output.parts = [
        {
          type: "text",
          text: `Return exactly this output and nothing else:\n\n${result}`,
        } as any,
      ];
    },

    "chat.message": async (_input, output) => {
      const engine = await resolveEngine();
      const query = output.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")
        .trim();

      if (query) {
        const results = await engine.retrieveMemories(query, { projects }, 10);
        if (results.length > 0) {
          const context = formatRelevantMemoryContext(results);
          output.parts.push({
            id: `prt_${crypto.randomUUID().replaceAll("-", "")}`,
            sessionID: output.message.sessionID,
            messageID: output.message.id,
            type: "text",
            text: context,
            synthetic: true,
          } as never);
        }
      }

      await captureUserPromptMemory(engine, pluginInput, output as never);
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; args: Record<string, unknown> },
      output
    ) => {
      const engine = await resolveEngine();
      const project = projectName(pluginInput);
      const argumentText = JSON.stringify(input.args);
      const files = Array.from(
        new Set(
          Object.values(input.args)
            .filter((value): value is string => typeof value === "string")
            .filter((value) => value.includes("/") || value.includes(".")),
        ),
      ).slice(0, 10);

      if (output.output && shouldCaptureToolOutput(input.tool, output.output, files)) {
        const kind = toolKind(input.tool);
        await engine.captureMemory(
          input.sessionID,
          project,
          {
            title: `Tool: ${input.tool}`,
            narrative: output.output.substring(0, 2000),
            facts: argumentText.length > 2 ? [argumentText.slice(0, 300)] : [],
            concepts: withSourceConcepts("opencode", [input.tool, ...extractConcepts(output.output)]),
            filesRead: files,
            filesModified: kind === "change" ? files : [],
          },
          kind,
          kind === "change" ? 0.85 : files.length > 0 ? 0.7 : 0.6,
        );
      }
    },

    "experimental.session.compacting": async (_input, output) => {
      const engine = await resolveEngine();
      const results = await engine.retrieveMemories("", { projects }, 100);
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

    "experimental.chat.system.transform": async (_input, output) => {
      const engine = await resolveEngine();
      const results = await engine.retrieveMemories(
        "",
        {
          projects,
          tiers: ["semantic", "procedural", "episodic"] as never,
        },
        12,
      );

      if (results.length === 0) return;

      output.system.push(
        [
          "Long-term project memory:",
          "Treat these as established context for this repository. Reuse them instead of asking the user to restate known background unless something is ambiguous or contradicted.",
          ...results.map((result) =>
            `- [${result.cmu.tier}] ${result.cmu.content.title}: ${result.cmu.content.narrative.slice(0, 220)}`,
          ),
        ].join("\n"),
      );
    },

    event: async ({ event }) => {
      if (event.type === "command.executed") {
        const engine = await resolveEngine();
        await captureCommandMemory(
          engine,
          pluginInput,
          event.properties.sessionID,
          event.properties.name,
          event.properties.arguments,
        );
        return;
      }

      if (event.type === "session.idle" || event.type === "session.compacted") {
        const engine = await resolveEngine();
        await maybeConsolidate(engine);
      }
    },
  });

  return resolveHooks();
};

export default AiMemPlugin;
