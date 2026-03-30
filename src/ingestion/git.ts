import * as _simpleGitModule from 'simple-git';
import type { SimpleGit } from 'simple-git';
import * as path from 'node:path';

// simple-git has CJS/ESM interop issues: the default export might be nested
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mod = _simpleGitModule as any;
const simpleGit: (basePath?: string) => SimpleGit =
  typeof mod.simpleGit === 'function' ? mod.simpleGit :
  typeof mod.default === 'function' ? mod.default :
  typeof mod.default?.simpleGit === 'function' ? mod.default.simpleGit :
  mod.default?.default ?? mod;

let gitInstance: SimpleGit | null = null;

export function getGit(repoPath?: string): SimpleGit {
  if (!gitInstance || repoPath) {
    gitInstance = simpleGit(repoPath ?? process.cwd());
  }
  return gitInstance;
}

export async function getStagedDiff(repoPath?: string): Promise<string> {
  const git = getGit(repoPath);
  return git.diff(['--cached']);
}

export async function getWorkingDiff(repoPath?: string): Promise<string> {
  const git = getGit(repoPath);
  return git.diff();
}

export async function getCommitDiff(hash: string, repoPath?: string): Promise<string> {
  const git = getGit(repoPath);
  return git.diff([`${hash}~1`, hash]);
}

export async function getBranchDiff(branch: string, repoPath?: string): Promise<string> {
  const git = getGit(repoPath);
  const base = await getMergeBase(branch, repoPath);
  return git.diff([base, 'HEAD']);
}

export async function getMergeBase(branch: string, repoPath?: string): Promise<string> {
  const git = getGit(repoPath);
  const result = await git.raw(['merge-base', branch, 'HEAD']);
  return result.trim();
}

export async function getCurrentBranch(repoPath?: string): Promise<string> {
  const git = getGit(repoPath);
  const result = await git.revparse(['--abbrev-ref', 'HEAD']);
  return result.trim();
}

export async function getRepoRoot(repoPath?: string): Promise<string> {
  const git = getGit(repoPath);
  const result = await git.revparse(['--show-toplevel']);
  return path.resolve(result.trim());
}

export async function isGitRepo(dirPath?: string): Promise<boolean> {
  try {
    const git = simpleGit(dirPath ?? process.cwd());
    await git.status();
    return true;
  } catch {
    return false;
  }
}

export async function getLastNCommitDiffs(n: number, repoPath?: string): Promise<string> {
  const git = getGit(repoPath);
  return git.diff([`HEAD~${n}`, 'HEAD']);
}
