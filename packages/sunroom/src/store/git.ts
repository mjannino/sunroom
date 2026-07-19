import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Author } from "./types.js";

const run = promisify(execFile);

/**
 * Runs the git binary in `cwd`. Throws on a non-zero exit.
 *
 * Arguments are passed as an argv array — never interpolated into a shell
 * string — so a page title containing a quote or a semicolon cannot become
 * a command.
 */
export async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", args, {
    cwd,
    maxBuffer: 32 * 1024 * 1024,
    // Keep the caller's environment out of git's way, and make output stable.
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" },
  });
  return stdout.trim();
}

/**
 * A full commit argv carrying the author identity.
 *
 * Identity is supplied per-command with `-c`, so the store never writes to
 * global or repo git config — and CI needs no `git config user.email`.
 */
export function commitArgs(author: Author, message: string): string[] {
  return [
    "-c",
    `user.name=${author.name}`,
    "-c",
    `user.email=${author.email}`,
    "commit",
    "-m",
    message,
  ];
}

export async function hasCommits(cwd: string): Promise<boolean> {
  try {
    await git(cwd, ["rev-parse", "--verify", "HEAD"]);
    return true;
  } catch {
    return false;
  }
}
