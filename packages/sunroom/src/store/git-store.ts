import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative, sep } from "node:path";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { commitArgs, git, hasCommits } from "./git.js";
import { contentVersion } from "./hash.js";
import { HOME_SLUG, pathToSlug, slugToPath } from "./paths.js";
import type {
  Author,
  ContentStore,
  Page,
  PageEntry,
  PageSummary,
  SaveOptions,
  Settings,
} from "./types.js";
import { DEFAULT_SETTINGS } from "./types.js";
import { validatePageShape } from "./validate-page.js";

export const SYSTEM_AUTHOR: Author = {
  name: "Sunroom",
  email: "sunroom@localhost",
};

/** Every file is written exactly like this. The content hash depends on it. */
function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

async function writeAtomic(path: string, data: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, data, "utf8");
  await rename(tmp, path);
}

async function listJsonFiles(root: string): Promise<string[]> {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => join(e.parentPath, e.name));
}

// NOTE: `implements ContentStore` is temporarily dropped for this task.
// savePage/deletePage/saveSettings arrive in Tasks 8 and 9; until they exist,
// the class does not satisfy the interface. Restored in Task 9.
export class GitStore {
  private readonly dir: string;
  private pages = new Map<string, PageEntry>();
  private settings: Settings = DEFAULT_SETTINGS;
  /** Serialises writes. Concurrent saves queue instead of clobbering. */
  private chain: Promise<unknown> = Promise.resolve();

  constructor(dir: string) {
    this.dir = dir;
  }

  async init(): Promise<void> {
    await this.ensureRepo();
    await this.recover();
    await this.load();
  }

  /** Boot path 1 (existing repo) and path 4 (git init an empty site). */
  private async ensureRepo(): Promise<void> {
    await mkdir(join(this.dir, "pages"), { recursive: true });

    if (!existsSync(join(this.dir, ".git"))) {
      await git(this.dir, ["init", "-b", "main"]);
    }

    if (!(await hasCommits(this.dir))) {
      const home: Page = {
        slug: HOME_SLUG,
        title: "Home",
        position: 0,
        seo: {},
        sections: [],
      };
      await writeFile(
        join(this.dir, "settings.json"),
        serialize(DEFAULT_SETTINGS),
        "utf8",
      );
      await writeFile(
        join(this.dir, "pages", "index.json"),
        serialize(home),
        "utf8",
      );
      await git(this.dir, ["add", "-A"]);
      await git(
        this.dir,
        commitArgs(SYSTEM_AUTHOR, "Initialize Sunroom content"),
      );
    }
  }

  /**
   * The working copy is never trusted across a save boundary. Anything
   * uncommitted is debris from a crashed save, and is discarded — including
   * stray `.tmp-*` files, which `git clean -fd` removes because they are
   * untracked.
   */
  private async recover(): Promise<void> {
    await git(this.dir, ["reset", "--hard", "HEAD"]);
    await git(this.dir, ["clean", "-fd"]);
  }

  private async load(): Promise<void> {
    const pages = new Map<string, PageEntry>();

    for (const file of await listJsonFiles(join(this.dir, "pages"))) {
      const raw = await readFile(file, "utf8");
      const page = JSON.parse(raw) as Page;
      const rel = relative(this.dir, file).split(sep).join(posix.sep);
      const slug = pathToSlug(rel);
      pages.set(slug, {
        page: { ...page, slug },
        version: contentVersion(raw),
      });
    }

    this.pages = pages;
    this.settings = JSON.parse(
      await readFile(join(this.dir, "settings.json"), "utf8"),
    ) as Settings;
  }

  listPages(): PageSummary[] {
    return [...this.pages.values()]
      .map(({ page }) => ({
        slug: page.slug,
        title: page.title,
        position: page.position,
      }))
      .sort((a, b) => a.position - b.position || a.slug.localeCompare(b.slug));
  }

  getPage(slug: string): PageEntry | null {
    return this.pages.get(slug) ?? null;
  }

  getSettings(): Settings {
    return this.settings;
  }

  // savePage / deletePage / saveSettings — Tasks 8 and 9.
}
