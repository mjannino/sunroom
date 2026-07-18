import type { FieldMap } from "../../core/fields.js";
import type { Page } from "../../store/types.js";

export type ActionResult =
  | { ok: true; version?: string }
  | {
      ok: false;
      reason: "unauthorized" | "conflict" | "validation" | "notfound";
      message: string;
    };

export interface SerializedSection {
  label: string;
  thumbnail?: string;
  deprecated?: boolean;
  fields: FieldMap;
}
export type SerializedRegistry = Record<string, SerializedSection>;

export interface EditorActions {
  savePage(page: Page, baseVersion: string | null): Promise<ActionResult>;
  createPage(input: { slug: string; title: string }): Promise<ActionResult>;
  deletePage(slug: string): Promise<ActionResult>;
  reorderPages(orderedSlugs: string[]): Promise<ActionResult>;
}

export interface CommitMediaInput {
  storageKey: string;
  filename: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  alt: string;
}

export type MediaResult<T> =
  | ({ ok: true } & T)
  | { ok: false; reason: "unauthorized" | "config" | "error"; message: string };

export interface MediaActions {
  requestUpload(
    filename: string,
    mime: string,
  ): Promise<MediaResult<{ uploadUrl: string; storageKey: string }>>;
  commitMedia(
    input: CommitMediaInput,
  ): Promise<MediaResult<{ id: string; url: string }>>;
  deleteMedia(id: string): Promise<MediaResult<Record<string, never>>>;
}

export interface MediaItem {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  filename: string;
}
