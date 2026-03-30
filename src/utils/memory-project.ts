import fs from "fs";
import os from "os";
import path from "path";
import type { PluginInput } from "@opencode-ai/plugin";
import { getProjectContext } from "./project-name";

type ProjectResolution = {
  project: string;
  projects: string[];
  directory: string;
};

const DIRECTORY_KEYS = new Set(["cwd", "workdir", "directory", "dir", "root"]);
const FILE_KEYS = new Set([
  "file",
  "filepath",
  "filePath",
  "path",
  "paths",
  "target",
  "targetPath",
  "from",
  "to",
]);

const CD_PATTERN = /(?:^|&&|\|\||;)\s*cd\s+("[^"]+"|'[^']+'|[^\s;|&]+)/g;

function trimQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function maybeAbsolute(value: string): boolean {
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);
}

function maybePathLike(value: string): boolean {
  if (!value || value.length > 4096) return false;
  if (value.includes("\n")) return false;
  if (maybeAbsolute(value)) return true;
  return value.startsWith("./") || value.startsWith("../") || value.includes("/");
}

function resolvePath(value: string, baseDir: string): string | null {
  const trimmed = trimQuotes(value.trim());
  if (!maybePathLike(trimmed)) return null;
  const expanded = trimmed === "~" ? os.homedir() : trimmed.replace(/^~(?=\/|\\)/, os.homedir());
  return path.resolve(baseDir, expanded);
}

function normalizeDirectory(candidate: string): string {
  try {
    const stat = fs.statSync(candidate);
    const directory = stat.isDirectory() ? candidate : path.dirname(candidate);
    return findProjectRoot(directory);
  } catch {
    const directory = path.extname(candidate) ? path.dirname(candidate) : candidate;
    return findProjectRoot(directory);
  }
}

function findProjectRoot(start: string): string {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return start;
    }
    current = parent;
  }
}

function pushCandidate(acc: string[], value: string | null | undefined, baseDir: string, asDirectory: boolean): void {
  if (!value) return;
  const resolved = resolvePath(value, baseDir);
  if (!resolved) return;
  acc.push(asDirectory ? normalizeDirectory(resolved) : normalizeDirectory(resolved));
}

function collectObjectCandidates(
  value: unknown,
  baseDir: string,
  directories: string[],
  files: string[],
): void {
  if (typeof value === "string") {
    if (value.includes("cd ")) {
      for (const match of value.matchAll(CD_PATTERN)) {
        pushCandidate(directories, match[1], baseDir, true);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjectCandidates(item, baseDir, directories, files);
    }
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value)) {
    if (typeof nested === "string") {
      if (DIRECTORY_KEYS.has(key)) {
        pushCandidate(directories, nested, baseDir, true);
      } else if (FILE_KEYS.has(key)) {
        pushCandidate(files, nested, baseDir, false);
      } else if (nested.includes("cd ")) {
        for (const match of nested.matchAll(CD_PATTERN)) {
          pushCandidate(directories, match[1], baseDir, true);
        }
      } else if (key.toLowerCase().includes("file") || key.toLowerCase().includes("path")) {
        pushCandidate(files, nested, baseDir, false);
      }
    } else {
      collectObjectCandidates(nested, baseDir, directories, files);
    }
  }
}

export function resolveMemoryProject(pluginInput: PluginInput, args?: unknown): ProjectResolution {
  const directories: string[] = [];
  const files: string[] = [];
  collectObjectCandidates(args, pluginInput.project.worktree, directories, files);

  const candidate = directories[0] || files[0] || pluginInput.project.worktree;
  const context = getProjectContext(candidate);

  return {
    project: context.canonical,
    projects: context.allProjects,
    directory: candidate,
  };
}
