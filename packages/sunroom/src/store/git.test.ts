import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commitArgs, git, hasCommits } from "./git.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sunroom-git-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("git", () => {
  it("runs a command and returns trimmed stdout", async () => {
    await git(dir, ["init", "-b", "main"]);
    await writeFile(join(dir, "a.txt"), "hello\n");
    await git(dir, ["add", "-A"]);
    await git(
      dir,
      commitArgs({ name: "Test", email: "test@example.com" }, "first"),
    );
    expect(await git(dir, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe("main");
  });

  it("throws on a failing command", async () => {
    await expect(git(dir, ["rev-parse", "HEAD"])).rejects.toThrow();
  });
});

describe("hasCommits", () => {
  it("is false for a fresh repo and true after a commit", async () => {
    await git(dir, ["init", "-b", "main"]);
    expect(await hasCommits(dir)).toBe(false);

    await writeFile(join(dir, "a.txt"), "hello\n");
    await git(dir, ["add", "-A"]);
    await git(
      dir,
      commitArgs({ name: "Test", email: "test@example.com" }, "first"),
    );

    expect(await hasCommits(dir)).toBe(true);
  });
});

describe("commitArgs", () => {
  it("does not pass --allow-empty", () => {
    const args = commitArgs({ name: "A", email: "a@b.c" }, "msg");
    expect(args).not.toContain("--allow-empty");
    expect(args).toEqual([
      "-c",
      "user.name=A",
      "-c",
      "user.email=a@b.c",
      "commit",
      "-m",
      "msg",
    ]);
  });

  it("records the author identity without touching git config", async () => {
    await git(dir, ["init", "-b", "main"]);
    await writeFile(join(dir, "a.txt"), "hello\n");
    await git(dir, ["add", "-A"]);
    await git(
      dir,
      commitArgs({ name: "Jane Doe", email: "jane@acme.com" }, "Update home"),
    );

    expect(await git(dir, ["log", "-1", "--format=%an <%ae>"])).toBe(
      "Jane Doe <jane@acme.com>",
    );
    expect(await git(dir, ["log", "-1", "--format=%s"])).toBe("Update home");
  });
});
