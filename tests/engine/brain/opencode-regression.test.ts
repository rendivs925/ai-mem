import { afterEach, describe, expect, it } from "bun:test";
import { AiMemDatabase } from "../../../src/services/sqlite/Database.js";
import { createBrainEngine } from "../../../src/engine/brain/engine.js";
import { calculateBaseActivation } from "../../../src/engine/brain/activation.js";
import { defaultBrainSettings, parseBrainSettings } from "../../../src/config/brain-settings.js";
import { getProjectAliases, getProjectContext } from "../../../src/utils/project-name.js";
import { MemoryTier } from "../../../src/types/brain/memory.js";

describe("OpenCode brain integration regressions", () => {
  const databases: AiMemDatabase[] = [];

  afterEach(() => {
    for (const db of databases.splice(0)) {
      db.close();
    }
  });

  it("uses defaults silently when settings are missing", () => {
    expect(parseBrainSettings(undefined)).toEqual(defaultBrainSettings);
    expect(parseBrainSettings(null)).toEqual(defaultBrainSettings);
  });

  it("returns stored memories for empty queries", async () => {
    const db = new AiMemDatabase(":memory:");
    databases.push(db);

    const engine = createBrainEngine(db.db);
    await engine.initialize();
    await engine.captureMemory(
      "session-1",
      "project-a",
      {
        title: "Alpha memory",
        narrative: "Remember this implementation detail",
        facts: [],
        concepts: ["alpha"],
        filesRead: [],
        filesModified: [],
      },
      "discovery",
      0.7,
    );

    const results = await engine.retrieveMemories("", {}, 10);

    expect(results.length).toBe(1);
    expect(results[0]?.cmu.content.title).toBe("Alpha memory");
  });

  it("reports committed and evidence counts in memory stats", async () => {
    const db = new AiMemDatabase(":memory:");
    databases.push(db);

    const engine = createBrainEngine(db.db);
    await engine.initialize();

    await engine.captureMemory(
      "session-stats-1",
      "project-a",
      {
        title: "Tool: read",
        narrative: "read src/parser.ts",
        facts: [],
        concepts: ["parser"],
        filesRead: ["src/parser.ts"],
        filesModified: [],
      },
      "discovery",
      0.5,
    );

    await engine.captureMemory(
      "session-stats-2",
      "project-a",
      {
        title: "Parser architecture",
        narrative: "Parser uses a builder phase for node creation.",
        facts: ["builder phase"],
        concepts: ["parser", "builder", "architecture"],
        filesRead: ["src/parser.ts"],
        filesModified: [],
      },
      "decision",
      0.82,
    );

    const stats = await engine.getStats();

    expect(stats.total).toBe(2);
    expect(stats.committed).toBeGreaterThanOrEqual(1);
    expect(stats.evidence).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(stats.topSignals)).toBe(true);
  });

  it("matches any supplied keyword instead of requiring one combined pattern", async () => {
    const db = new AiMemDatabase(":memory:");
    databases.push(db);

    const engine = createBrainEngine(db.db);
    await engine.initialize();
    await engine.captureMemory(
      "session-1",
      "project-a",
      {
        title: "Alpha memory",
        narrative: "alpha implementation detail",
        facts: [],
        concepts: ["alpha"],
        filesRead: [],
        filesModified: [],
      },
      "discovery",
      0.7,
    );
    await engine.captureMemory(
      "session-2",
      "project-a",
      {
        title: "Beta memory",
        narrative: "beta debugging note",
        facts: [],
        concepts: ["beta"],
        filesRead: [],
        filesModified: [],
      },
      "discovery",
      0.7,
    );

    const results = await engine.retrieveMemories("alpha beta", {}, 10);
    const titles = results.map((result) => result.cmu.content.title);

    expect(titles).toContain("Alpha memory");
    expect(titles).toContain("Beta memory");
  });

  it("creates the backing session row and recalls memories by persisted row id", async () => {
    const db = new AiMemDatabase(":memory:");
    databases.push(db);

    const engine = createBrainEngine(db.db);
    await engine.initialize();

    const stored = await engine.captureMemory(
      "session-3",
      "project-a",
      {
        title: "Gamma memory",
        narrative: "persistent storage path",
        facts: ["uses real sqlite row ids"],
        concepts: ["gamma"],
        filesRead: ["src/plugin/opencode.ts"],
        filesModified: [],
      },
      "discovery",
      0.8,
    );

    const sessionRow = db.db
      .query("SELECT memory_session_id, project FROM sdk_sessions WHERE memory_session_id = ?")
      .get(stored.sessionId) as { memory_session_id: string; project: string } | null;
    const recalled = await engine.getMemoryById(stored.id);

    expect(sessionRow).toEqual({ memory_session_id: "session-3", project: "project-a" });
    expect(recalled?.id).toBe(stored.id);
    expect(recalled?.content.title).toBe("Gamma memory");
    expect(recalled?.content.facts).toEqual(["uses real sqlite row ids"]);
  });

  it("decays activation using millisecond timestamps instead of pinning everything to fresh", () => {
    const recentlyAccessed = calculateBaseActivation(2, Date.now() - 1_000);
    const staleMemory = calculateBaseActivation(2, Date.now() - 7 * 24 * 60 * 60 * 1000);

    expect(staleMemory).toBeLessThan(recentlyAccessed);
  });

  it("persists consolidation by linking related memories and removing duplicates", async () => {
    const db = new AiMemDatabase(":memory:");
    databases.push(db);

    const engine = createBrainEngine(db.db);
    await engine.initialize();

    const first = await engine.captureMemory(
      "session-4",
      "project-a",
      {
        title: "Alpha implementation note",
        narrative: "shared concept and same detail",
        facts: [],
        concepts: ["alpha", "parser"],
        filesRead: ["src/parser.ts"],
        filesModified: [],
      },
      "discovery",
      0.7,
    );
    await engine.recordAccess(first.id);

    const duplicate = await engine.captureMemory(
      "session-5",
      "project-a",
      {
        title: "Alpha implementation note",
        narrative: "shared concept and same detail",
        facts: [],
        concepts: ["alpha", "parser"],
        filesRead: ["src/parser.ts"],
        filesModified: [],
      },
      "discovery",
      0.7,
    );

    const related = await engine.captureMemory(
      "session-6",
      "project-a",
      {
        title: "Parser workflow",
        narrative: "parser workflow for alpha requests",
        facts: [],
        concepts: ["alpha", "parser", "workflow"],
        filesRead: ["src/parser.ts"],
        filesModified: [],
      },
      "discovery",
      0.7,
    );

    const result = await engine.consolidate();
    const remaining = await engine.retrieveMemories("", {}, 10);
    const refreshedFirst = await engine.getMemoryById(first.id);

    expect(result.merged).toBeGreaterThanOrEqual(1);
    expect(remaining.map((item) => item.cmu.id)).not.toContain(duplicate.id);
    expect(remaining.length).toBeGreaterThanOrEqual(2);
    expect(refreshedFirst?.associations).toContain(related.id);
  });

  it("matches canonical and legacy project names across tools", async () => {
    const db = new AiMemDatabase(":memory:");
    databases.push(db);

    const engine = createBrainEngine(db.db);
    await engine.initialize();

    const context = getProjectContext("/home/rendi/projects/opencode-rs");
    await engine.captureMemory(
      "session-7",
      context.canonical,
      {
        title: "Shared memory",
        narrative: "Persisted once and reusable across tools",
        facts: [],
        concepts: ["source:opencode", "shared"],
        filesRead: [],
        filesModified: [],
      },
      "discovery",
      0.7,
    );

    const legacyResults = await engine.retrieveMemories("shared", { projects: ["opencode-rs"] }, 10);
    const canonicalResults = await engine.retrieveMemories("shared", { projects: getProjectAliases(context.canonical) }, 10);

    expect(legacyResults).toHaveLength(1);
    expect(canonicalResults).toHaveLength(1);
    expect(legacyResults[0]?.cmu.project).toBe(context.canonical);
  });

  it("ranks semantic memory above raw tool evidence for the same topic", async () => {
    const db = new AiMemDatabase(":memory:");
    databases.push(db);

    const engine = createBrainEngine(db.db);
    await engine.initialize();

    await engine.captureMemory(
      "session-8",
      "project-a",
      {
        title: "Tool: read",
        narrative: "read src/parser.ts to inspect parser implementation details",
        facts: [],
        concepts: ["parser", "inspection"],
        filesRead: ["src/parser.ts"],
        filesModified: [],
      },
      "discovery",
      0.55,
    );

    await engine.captureMemory(
      "session-9",
      "project-a",
      {
        title: "Parser architecture",
        narrative: "The parser tokenizes input before delegating node creation to the builder.",
        facts: ["parser uses a builder phase"],
        concepts: ["parser", "builder", "architecture"],
        filesRead: ["src/parser.ts"],
        filesModified: [],
      },
      "decision",
      0.8,
    );

    const results = await engine.retrieveMemories("parser", { projects: ["project-a"] }, 10);

    expect(results[0]?.cmu.content.title).toBe("Parser architecture");
    expect(results.some((result) => result.cmu.tier === MemoryTier.Sensory)).toBe(true);
  });

  it("promotes repeated episodes into semantic and procedural memory during consolidation", async () => {
    const db = new AiMemDatabase(":memory:");
    databases.push(db);

    const engine = createBrainEngine(db.db);
    await engine.initialize();

    await engine.captureMemory(
      "session-10",
      "project-a",
      {
        title: "Investigated parser pipeline",
        narrative: "Parser workflow uses src/parser.ts and builder coordination",
        facts: ["builder is involved"],
        concepts: ["parser", "builder", "workflow"],
        filesRead: ["src/parser.ts"],
        filesModified: [],
      },
      "discovery",
      0.7,
    );

    await engine.captureMemory(
      "session-11",
      "project-a",
      {
        title: "Debugged parser behavior",
        narrative: "Parser workflow in src/parser.ts repeats the same builder coordination",
        facts: ["parser behavior is stable"],
        concepts: ["parser", "builder", "workflow"],
        filesRead: ["src/parser.ts"],
        filesModified: [],
      },
      "discovery",
      0.72,
    );

    await engine.captureMemory(
      "session-12",
      "project-a",
      {
        title: "Procedure: /build",
        narrative: "/build --release verified the parser changes",
        facts: ["release build was used"],
        concepts: ["build", "workflow", "parser"],
        filesRead: [],
        filesModified: ["src/parser.ts"],
      },
      "change",
      0.8,
    );

    await engine.captureMemory(
      "session-13",
      "project-a",
      {
        title: "Procedure: /build",
        narrative: "/build --release is the repeated verification path for parser work",
        facts: ["build verifies parser work"],
        concepts: ["build", "workflow", "verification"],
        filesRead: [],
        filesModified: ["src/parser.ts"],
      },
      "change",
      0.82,
    );

    await engine.consolidate();
    const results = await engine.retrieveMemories("parser build", { projects: ["project-a"] }, 20);
    const titles = results.map((result) => result.cmu.content.title);

    expect(titles.some((title) => title.startsWith("Knowledge:"))).toBe(true);
    expect(titles.some((title) => title.startsWith("Workflow:"))).toBe(true);
  });

  it("extracts a workflow from a successful multi-step session trajectory", async () => {
    const db = new AiMemDatabase(":memory:");
    databases.push(db);

    const engine = createBrainEngine(db.db);
    await engine.initialize();

    await engine.captureMemory(
      "session-20",
      "project-a",
      {
        title: "Procedure: /inspect",
        narrative: "Inspect parser and identify the failing branch",
        facts: ["inspect parser"],
        concepts: ["inspect", "parser", "workflow"],
        filesRead: ["src/parser.ts"],
        filesModified: [],
      },
      "discovery",
      0.72,
    );

    await engine.captureMemory(
      "session-20",
      "project-a",
      {
        title: "Procedure: /edit",
        narrative: "Edit parser branch handling",
        facts: ["edit parser branch"],
        concepts: ["edit", "parser", "workflow"],
        filesRead: [],
        filesModified: ["src/parser.ts"],
      },
      "change",
      0.84,
    );

    await engine.captureMemory(
      "session-20",
      "project-a",
      {
        title: "Procedure: /build",
        narrative: "Build and verify the parser fix",
        facts: ["verify parser fix"],
        concepts: ["build", "verify", "workflow"],
        filesRead: [],
        filesModified: ["src/parser.ts"],
      },
      "change",
      0.85,
    );

    await engine.consolidate();
    const results = await engine.retrieveMemories("inspect edit build parser", { projects: ["project-a"] }, 20);
    const workflow = results.find((result) => result.cmu.content.title.startsWith("Workflow:"));

    expect(workflow).toBeDefined();
    expect(workflow?.cmu.content.narrative).toContain("/inspect");
    expect(workflow?.cmu.content.narrative).toContain("/edit");
    expect(workflow?.cmu.content.narrative).toContain("/build");
  });

  it("promotes repeated constraints into stable semantic knowledge", async () => {
    const db = new AiMemDatabase(":memory:");
    databases.push(db);

    const engine = createBrainEngine(db.db);
    await engine.initialize();

    await engine.captureMemory(
      "session-30",
      "project-a",
      {
        title: "User constraint",
        narrative: "Do not use placeholder or stub behavior in the plugin path",
        facts: ["Do not use placeholder or stub behavior in the plugin path"],
        concepts: ["constraint", "plugin", "quality"],
        filesRead: [],
        filesModified: [],
      },
      "decision",
      0.82,
    );

    await engine.captureMemory(
      "session-31",
      "project-a",
      {
        title: "Reminder",
        narrative: "Do not use placeholder or stub behavior in the plugin path",
        facts: ["Do not use placeholder or stub behavior in the plugin path"],
        concepts: ["constraint", "plugin", "quality"],
        filesRead: [],
        filesModified: [],
      },
      "decision",
      0.84,
    );

    await engine.consolidate();
    const results = await engine.retrieveMemories("placeholder stub plugin", { projects: ["project-a"] }, 20);

    expect(
      results.some((result) =>
        result.cmu.tier === MemoryTier.Semantic &&
        result.cmu.content.narrative.toLowerCase().includes("do not use placeholder or stub behavior"),
      ),
    ).toBe(true);
  });
});
