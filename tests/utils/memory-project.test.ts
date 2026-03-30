import { afterEach, describe, expect, it } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import { resolveMemoryProject } from "../../src/utils/memory-project.js";

const tempRoots: string[] = [];

function createDummyProject(name: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-mem-project-"));
  const projectDir = path.join(root, name);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(path.join(projectDir, ".git"));
  tempRoots.push(root);
  return projectDir;
}

const pluginInput = {
  project: {
    id: "proj-1",
    name: "ai-mem",
    worktree: "/tmp/dummy-root/opencode-rs/ai-mem",
  },
} as any;

describe("memory project resolver", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("prefers explicit workdir for bash-like tools", () => {
    const projectDir = createDummyProject("project-b");
    const resolved = resolveMemoryProject(pluginInput, {
      command: "npm test",
      workdir: projectDir,
    });

    expect(resolved.project).toBe(path.basename(tempRoots[0]!) + "/project-b");
    expect(resolved.projects).toContain("project-b");
  });

  it("uses file paths when a tool targets another repo", () => {
    const projectDir = createDummyProject("project-c");
    const resolved = resolveMemoryProject(pluginInput, {
      filePath: path.join(projectDir, "src/index.ts"),
    });

    expect(resolved.project).toBe(path.basename(tempRoots[0]!) + "/project-c");
  });

  it("falls back to cd targets inside shell commands", () => {
    const projectDir = createDummyProject("project-d");
    const resolved = resolveMemoryProject(pluginInput, {
      command: `cd ${projectDir} && bun test`,
    });

    expect(resolved.project).toBe(path.basename(tempRoots[0]!) + "/project-d");
  });

  it("falls back to the session worktree when no better target exists", () => {
    const resolved = resolveMemoryProject(pluginInput, {
      query: "remember parser architecture",
    });

    expect(resolved.project).toBe("opencode-rs/ai-mem");
  });
});
