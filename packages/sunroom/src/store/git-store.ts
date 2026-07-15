import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative, sep } from "node:path";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { commitArgs, git, hasCommits } from "./git.js";
import { contentVersion } from "./hash.js";
import { HOME_SLUG, pathToSlug, slugToPath, validateSlug } from "./paths.js";
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

export class GitStore implements ContentStore {
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

  /**
   * Serialises all writes through a promise chain. Two concurrent saves to the
   * same page cannot interleave; the second one sees the first one's version
   * and conflicts, which is the correct answer.
   */
  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.chain.then(fn, fn);
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  /**
   * Rolls the working copy back to HEAD and reloads the index from disk.
   *
   * Called when a save fails partway. If the rollback itself fails (a truly
   * broken repo), we swallow that error so the ORIGINAL failure is what the
   * caller sees — a "could not reset" message would hide the real cause.
   */
  private async rollback(): Promise<void> {
    try {
      await this.recover();
      await this.load();
    } catch {
      // Deliberately ignored. See above.
    }
  }

  async savePage(
    page: Page,
    { baseVersion, author }: SaveOptions,
  ): Promise<PageEntry> {
    return this.withLock(async () => {
      const issues = validatePageShape(page);
      if (issues.length > 0) throw new ValidationError(issues);

      const existing = this.pages.get(page.slug) ?? null;
      if ((existing?.version ?? null) !== baseVersion) {
        throw new ConflictError(page.slug);
      }

      const rel = slugToPath(page.slug);
      const json = serialize(page);

      try {
        await writeAtomic(join(this.dir, rel), json);
        await git(this.dir, ["add", "--", rel]);
        await git(
          this.dir,
          commitArgs(
            author,
            `${existing ? "Update" : "Create"} ${page.slug || "home"}`,
          ),
        );
      } catch (error) {
        await this.rollback();
        throw error;
      }

      const entry: PageEntry = { page, version: contentVersion(json) };
      this.pages.set(page.slug, entry);
      return entry;
    });
  }

  async deletePage(
    slug: string,
    { baseVersion, author }: { baseVersion: string; author: Author },
  ): Promise<void> {
    return this.withLock(async () => {
      if (slug === HOME_SLUG) {
        throw new ValidationError([
          { path: "slug", message: "The home page cannot be deleted" },
        ]);
      }

      const issues = validateSlug(slug);
      if (issues.length > 0) throw new ValidationError(issues);

      const existing = this.pages.get(slug);
      if (!existing) throw new NotFoundError(slug);
      if (existing.version !== baseVersion) throw new ConflictError(slug);

      const rel = slugToPath(slug);

      try {
        await git(this.dir, ["rm", "--quiet", "--", rel]);
        await git(this.dir, commitArgs(author, `Delete ${slug}`));
      } catch (error) {
        await this.rollback();
        throw error;
      }

      this.pages.delete(slug);
    });
  }

  async saveSettings(
    settings: Settings,
    { author }: { author: Author },
  ): Promise<void> {
    return this.withLock(async () => {
      const json = serialize(settings);

      try {
        await writeAtomic(join(this.dir, "settings.json"), json);
        await git(this.dir, ["add", "--", "settings.json"]);
        await git(this.dir, commitArgs(author, "Update settings"));
      } catch (error) {
        await this.rollback();
        throw error;
      }

      this.settings = settings;
    });
  }
}
