"use client";
import { useState } from "react";
import type { MediaActions, MediaItem } from "./types.js";
import type { Page, Settings } from "../../store/types.js";
import { MediaProvider, useMedia } from "./MediaContext.js";
import { useMediaUpload } from "./use-media-upload.js";
import { findMediaUsage } from "../media-usage.js";

export function MediaScreen({
  media,
  pages,
  settings,
  actions,
}: {
  media: MediaItem[];
  pages: Page[];
  settings: Settings;
  actions: MediaActions;
}): React.ReactElement {
  return (
    <MediaProvider items={media} actions={actions}>
      <MediaScreenInner pages={pages} settings={settings} />
    </MediaProvider>
  );
}

function MediaScreenInner({
  pages,
  settings,
}: {
  pages: Page[];
  settings: Settings;
}): React.ReactElement {
  const { items, actions, update, remove } = useMedia();
  const { uploads, uploadFiles } = useMediaUpload();
  const [dragOver, setDragOver] = useState(false);

  async function saveAlt(id: string, alt: string): Promise<void> {
    const res = await actions.updateMedia(id, { alt });
    if (res.ok) update(id, { alt });
  }

  async function del(item: MediaItem): Promise<void> {
    const usage = findMediaUsage(pages, settings, item.id);
    const msg =
      usage.length > 0
        ? `Used on: ${usage.map((u) => `${u.slug || "(home)"} (${u.where})`).join(", ")} — delete anyway?`
        : "Delete this image?";
    if (!confirm(msg)) return;
    const res = await actions.deleteMedia(item.id);
    if (res.ok) remove(item.id);
  }

  return (
    <div data-screen="media" className="sr-screen">
      <h1 className="sr-title">Media</h1>
      <div
        className={`sr-dropzone${dragOver ? " is-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadFiles(e.dataTransfer.files);
        }}
      >
        <label className="sr-upload">
          Drop images here or click to upload
          <input
            type="file"
            multiple
            accept="image/*"
            aria-label="Upload images"
            onChange={(e) => uploadFiles(e.target.files ?? [])}
          />
        </label>
      </div>
      {uploads.length > 0 ? (
        <ul className="sr-uploads">
          {uploads.map((u) => (
            <li key={u.id} className="sr-upload-row">
              {u.name} — {u.status}
              {u.message ? `: ${u.message}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="sr-media-manage">
        {items.map((item) => {
          const usage = findMediaUsage(pages, settings, item.id);
          return (
            <li key={item.id} className="sr-media-mrow">
              <img
                src={item.url}
                alt={item.alt}
                width={80}
                height={80}
                className="sr-thumb"
              />
              <div className="sr-media-meta">
                <label className="sr-flabel">
                  Alt text{" "}
                  <input
                    className="sr-input"
                    defaultValue={item.alt}
                    onBlur={(e) => void saveAlt(item.id, e.target.value)}
                  />
                </label>
                <span className="sr-slug">
                  {usage.length > 0
                    ? `Used on ${usage.length} page${usage.length > 1 ? "s" : ""}`
                    : "Unused"}
                </span>
              </div>
              <button
                type="button"
                className="sr-btn sr-btn-icon sr-btn-danger"
                aria-label={`delete ${item.alt || item.id}`}
                onClick={() => void del(item)}
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
