#!/usr/bin/env bun
/**
 * Statusline Counts — lightweight project-scoped observation counter
 *
 * Returns JSON with observation and prompt counts for the given project,
 * suitable for integration into Claude Code's statusLineCommand.
 *
 * Usage:
 *   bun statusline-counts.js <cwd>
 *   bun statusline-counts.js /home/user/my-project
 *
 * Output (JSON, stdout):
 *   {"observations": 42, "prompts": 15, "project": "my-project"}
 *
 * The project name is derived from basename(cwd). Observations are counted
 * with a WHERE project = ? filter so only the current project's data is
 * returned — preventing inflated counts from cross-project observations.
 *
 * Performance: ~10ms typical (direct SQLite read, no HTTP, no worker dependency)
 */
import { Database } from "bun:sqlite";
import { existsSync, readFileSync, copyFileSync, renameSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, basename, dirname } from "path";

const cwd = process.argv[2] || process.env.CLAUDE_CWD || process.cwd();
const project = basename(cwd);

try {
  // Resolve data directory: env var → settings.json → default
  let dataDir = process.env.AI_MEM_DATA_DIR || process.env.CLAUDE_MEM_DATA_DIR || join(homedir(), ".ai-mem");
  if (!process.env.CLAUDE_MEM_DATA_DIR) {
    const settingsPath = join(dataDir, "settings.json");
    if (existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
        const flat = settings.env ?? settings;
        if (flat.AI_MEM_DATA_DIR) dataDir = flat.AI_MEM_DATA_DIR;
        else if (flat.CLAUDE_MEM_DATA_DIR) dataDir = flat.CLAUDE_MEM_DATA_DIR;
      } catch { /* use default */ }
    }
  }

  const dbPath = join(dataDir, "ai-mem.db");
  const legacyPaths = [
    join(dataDir, "claude-mem.db"),
    join(homedir(), ".claude-mem", "claude-mem.db"),
  ];

  if (!existsSync(dbPath)) {
    mkdirSync(dirname(dbPath), { recursive: true });
    for (const legacy of legacyPaths) {
      if (!existsSync(legacy)) continue;
      const sourceDir = dirname(legacy);
      const targetDir = dirname(dbPath);
      for (const item of [legacy, `${legacy}-wal`, `${legacy}-shm`]) {
        if (!existsSync(item)) continue;
        const destination = join(targetDir, basename(item).replace(basename(legacy), basename(dbPath)));
        if (sourceDir === targetDir) renameSync(item, destination);
        else copyFileSync(item, destination);
      }
      break;
    }
  }

  if (!existsSync(dbPath)) {
    console.log(JSON.stringify({ observations: 0, prompts: 0, project }));
    process.exit(0);
  }

  const db = new Database(dbPath, { readonly: true });

  const obs = db.query("SELECT COUNT(*) as c FROM observations WHERE project = ?").get(project);
  // user_prompts links to projects through sdk_sessions.content_session_id
  const prompts = db.query(
    `SELECT COUNT(*) as c FROM user_prompts up
     JOIN sdk_sessions s ON s.content_session_id = up.content_session_id
     WHERE s.project = ?`
  ).get(project);
  console.log(JSON.stringify({ observations: obs.c, prompts: prompts.c, project }));
  db.close();
} catch (e) {
  console.log(JSON.stringify({ observations: 0, prompts: 0, project, error: e.message }));
}
