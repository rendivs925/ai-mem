import { afterEach, describe, expect, it } from "bun:test";
import { ClaudeMemDatabase } from "../../../src/services/sqlite/Database.js";
import { createBrainEngine } from "../../../src/engine/brain/engine.js";
import { calculateBaseActivation } from "../../../src/engine/brain/activation.js";
import { defaultBrainSettings, parseBrainSettings } from "../../../src/config/brain-settings.js";

describe("OpenCode brain integration regressions", () => {
  const databases: ClaudeMemDatabase[] = [];

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
    const db = new ClaudeMemDatabase(":memory:");
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

  it("matches any supplied keyword instead of requiring one combined pattern", async () => {
    const db = new ClaudeMemDatabase(":memory:");
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
    const db = new ClaudeMemDatabase(":memory:");
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
    const db = new ClaudeMemDatabase(":memory:");
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
    expect(remaining.length).toBe(2);
    expect(refreshedFirst?.associations).toContain(related.id);
  });
});
