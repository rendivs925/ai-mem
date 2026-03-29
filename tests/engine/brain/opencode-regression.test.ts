import { afterEach, describe, expect, it } from "bun:test";
import { ClaudeMemDatabase } from "../../../src/services/sqlite/Database.js";
import { createBrainEngine } from "../../../src/engine/brain/engine.js";
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
});
