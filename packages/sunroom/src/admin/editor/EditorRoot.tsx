import type { ReactElement } from "react";
import type { SunroomConfig } from "../../core/registry.js";
import { resolveConfig } from "../../core/registry.js";
import { getStore } from "../../store/singleton.js";
import { makeResolveMedia } from "../../render/media.js";
import {
  commitMediaAction,
  createPageAction,
  deleteMediaAction,
  deletePageAction,
  requestUploadAction,
  reorderPagesAction,
  savePageAction,
} from "../actions.js";
import { screenFromSegments, serializeRegistry } from "../editor-core.js";
// Deliberately NOT a relative import: see the "sunroom/client" entry in
// tsup.config.ts's `external` list for why EditorRoot (server-only) must
// reach these 'use client' components through the public package specifier.
import { PageEditor, PagesScreen } from "sunroom/client";
import type { EditorActions, MediaActions } from "./types.js";

const actions: EditorActions = {
  savePage: savePageAction,
  createPage: createPageAction,
  deletePage: deletePageAction,
  reorderPages: reorderPagesAction,
};

const mediaActions: MediaActions = {
  requestUpload: requestUploadAction,
  commitMedia: commitMediaAction,
  deleteMedia: deleteMediaAction,
};

interface Props {
  config: SunroomConfig;
  params: Promise<{ segments?: string[] }>;
}

export async function EditorRoot({
  config,
  params,
}: Props): Promise<ReactElement> {
  const { segments } = await params;
  const store = await getStore(resolveConfig(config));
  const screen = screenFromSegments(segments);

  if (screen.screen === "pages") {
    return <PagesScreen pages={store.listPages()} actions={actions} />;
  }

  const entry = store.getPage(screen.slug);
  if (!entry) return <div data-screen="editor">Page not found.</div>;

  const base = process.env.R2_PUBLIC_BASE;
  const resolve = makeResolveMedia(store.listMedia(), base);
  const media = store.listMedia().map((m) => ({
    id: m.id,
    url: resolve(m.id)?.url ?? "",
    width: m.width,
    height: m.height,
    alt: m.alt,
    filename: m.filename,
  }));

  return (
    <PageEditor
      page={entry.page}
      version={entry.version}
      registry={serializeRegistry(config)}
      actions={actions}
      media={media}
      mediaActions={mediaActions}
    />
  );
}
