export interface SectionInstance {
  /** Stable across edits; used as the React key and the drag-reorder identity. */
  id: string;
  /** A key in `SunroomConfig.sections`. */
  type: string;
  props: Record<string, unknown>;
}

export interface PageSeo {
  title?: string;
  description?: string;
  /** A media id. Resolved to a URL in Phase 6. */
  ogImage?: string;
}

export interface Page {
  /** `''` is the home page. */
  slug: string;
  title: string;
  /** Drives nav ordering via `getPages()`. */
  position: number;
  seo: PageSeo;
  sections: SectionInstance[];
}

export interface PageSummary {
  slug: string;
  title: string;
  position: number;
}

export interface PageEntry {
  page: Page;
  /** Optimistic-concurrency token. Pass back as `baseVersion` on save. */
  version: string;
}

export interface Settings {
  seoDefaults: {
    titleTemplate?: string;
    description?: string;
  };
  /** Written automatically when a slug is renamed (Phase 7). */
  redirects: { from: string; to: string }[];
}

export interface Author {
  name: string;
  email: string;
}

export interface SaveOptions {
  /** The version the editor loaded. `null` when creating a new page. */
  baseVersion: string | null;
  author: Author;
}

export interface MediaRecord {
  id: string;
  storageKey: string;
  filename: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  alt: string;
  createdAt: string;
}

export interface ContentStore {
  /** Idempotent. Creates the repo if absent, discards any crashed-save debris, loads the index. */
  init(): Promise<void>;
  listPages(): PageSummary[];
  getPage(slug: string): PageEntry | null;
  savePage(page: Page, options: SaveOptions): Promise<PageEntry>;
  deletePage(
    slug: string,
    options: { baseVersion: string; author: Author },
  ): Promise<void>;
  getSettings(): Settings;
  saveSettings(settings: Settings, options: { author: Author }): Promise<void>;
  listMedia(): MediaRecord[];
  getMedia(id: string): MediaRecord | null;
  addMedia(record: MediaRecord, options: { author: Author }): Promise<void>;
  deleteMedia(id: string, options: { author: Author }): Promise<void>;
}

export const DEFAULT_SETTINGS: Settings = {
  seoDefaults: {},
  redirects: [],
};
