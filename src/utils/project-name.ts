import path from 'path';
import { logger } from './logger.js';
import { detectWorktree } from './worktree.js';

function normalizeProjectPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function splitProjectSegments(value: string): string[] {
  return normalizeProjectPath(value).split('/').filter(Boolean);
}

/**
 * Extract project name from working directory path
 * Handles edge cases: null/undefined cwd, drive roots, trailing slashes
 *
 * @param cwd - Current working directory (absolute path)
 * @returns Project name or "unknown-project" if extraction fails
 */
export function getProjectName(cwd: string | null | undefined): string {
  if (!cwd || cwd.trim() === '') {
    logger.warn('PROJECT_NAME', 'Empty cwd provided, using fallback', { cwd });
    return 'unknown-project';
  }

  // Extract basename (handles trailing slashes automatically)
  const basename = path.basename(cwd);

  // Edge case: Drive roots on Windows (C:\, J:\) or Unix root (/)
  // path.basename('C:\') returns '' (empty string)
  if (basename === '') {
    // Extract drive letter on Windows, or use 'root' on Unix
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const driveMatch = cwd.match(/^([A-Z]):\\/i);
      if (driveMatch) {
        const driveLetter = driveMatch[1].toUpperCase();
        const projectName = `drive-${driveLetter}`;
        logger.info('PROJECT_NAME', 'Drive root detected', { cwd, projectName });
        return projectName;
      }
    }
    logger.warn('PROJECT_NAME', 'Root directory detected, using fallback', { cwd });
    return 'unknown-project';
  }

  return basename;
}

/**
 * Get a collision-resistant project key using the last two path segments.
 * Example: /home/user/work/opencode-rs -> work/opencode-rs
 */
export function getCanonicalProjectName(cwd: string | null | undefined): string {
  if (!cwd || cwd.trim() === '') {
    return getProjectName(cwd);
  }

  const resolved = normalizeProjectPath(path.resolve(cwd));
  const segments = splitProjectSegments(resolved);

  if (segments.length === 0) {
    return getProjectName(cwd);
  }

  if (segments.length === 1) {
    return segments[0]!;
  }

  return `${segments[segments.length - 2]}/${segments[segments.length - 1]}`;
}

export function getProjectAliases(project: string | null | undefined): string[] {
  if (!project || project.trim() === '') {
    return ['unknown-project'];
  }

  const normalized = normalizeProjectPath(project.trim());
  const segments = splitProjectSegments(normalized);
  const aliases = new Set<string>([normalized]);

  if (segments.length > 0) {
    aliases.add(segments[segments.length - 1]!);
  }

  if (segments.length > 1) {
    aliases.add(`${segments[segments.length - 2]}/${segments[segments.length - 1]}`);
  }

  return Array.from(aliases);
}

/**
 * Project context with worktree awareness
 */
export interface ProjectContext {
  /** The current project name (worktree or main repo) */
  primary: string;
  /** Collision-resistant project key */
  canonical: string;
  /** Parent project name if in a worktree, null otherwise */
  parent: string | null;
  /** True if currently in a worktree */
  isWorktree: boolean;
  /** All project aliases to query across tools and historical naming schemes */
  allProjects: string[];
}

/**
 * Get project context with worktree detection.
 *
 * When in a worktree, returns both the worktree project name and parent project name
 * for unified timeline queries.
 *
 * @param cwd - Current working directory (absolute path)
 * @returns ProjectContext with worktree info
 */
export function getProjectContext(cwd: string | null | undefined): ProjectContext {
  const primary = getProjectName(cwd);
  const canonical = getCanonicalProjectName(cwd);

  if (!cwd) {
    return {
      primary,
      canonical,
      parent: null,
      isWorktree: false,
      allProjects: getProjectAliases(canonical),
    };
  }

  const worktreeInfo = detectWorktree(cwd);

  if (worktreeInfo.isWorktree && worktreeInfo.parentProjectName) {
    const allProjects = new Set<string>([
      ...getProjectAliases(canonical),
      ...getProjectAliases(worktreeInfo.parentProjectName),
      primary,
    ]);

    // In a worktree: include parent first for chronological ordering
    return {
      primary: canonical,
      canonical,
      parent: worktreeInfo.parentProjectName,
      isWorktree: true,
      allProjects: Array.from(allProjects),
    };
  }

  return {
    primary: canonical,
    canonical,
    parent: null,
    isWorktree: false,
    allProjects: getProjectAliases(canonical),
  };
}
