"use client";
import { useEffect, useState } from "react";
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
  const [selected, setSelected] = useState<string | null>(null);
  const item = items.find((i) => i.id === selected) ?? null;

  // Esc closes the lightbox while it's open.
  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  async function saveAlt(id: string, raw: string): Promise<void> {
    const alt = raw.trim();
    const res = await actions.updateMedia(id, { alt });
    if (res.ok) update(id, { alt });
  }

  async function del(target: MediaItem): Promise<void> {
    const usage = findMediaUsage(pages, settings, target.id);
    const msg =
      usage.length > 0
        ? `Used on: ${usage.map((u) => `${u.slug || "(home)"} (${u.where})`).join(", ")} — delete anyway?`
        : "Delete this image?";
    if (!confirm(msg)) return;
    const res = await actions.deleteMedia(target.id);
    if (res.ok) {
      remove(target.id);
      setSelected(null);
    }
  }

  const usage = item ? findMediaUsage(pages, settings, item.id) : [];
  const pageCount = new Set(usage.map((u) => u.slug)).size;

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

      <ul className="sr-media-tiles">
        {items.map((m) => (
          <li key={m.id} className="sr-tile-cell">
            <button
              type="button"
              className="sr-tile"
              aria-label={`Open ${m.alt || m.filename}`}
              onClick={() => setSelected(m.id)}
            >
              <img className="sr-tile-img" src={m.url} alt={m.alt} />
            </button>
            {m.alt ? (
              <span className="sr-tile-alt">{m.alt}</span>
            ) : (
              <span className="sr-tile-noalt">Missing alt</span>
            )}
          </li>
        ))}
      </ul>

      {item ? (
        <div className="sr-modal-backdrop" onClick={() => setSelected(null)}>
          <div
            className="sr-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Media: ${item.filename}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sr-dialog-head">
              <span>{item.filename}</span>
              <button
                type="button"
                className="sr-btn sr-btn-icon"
                aria-label="Close"
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>
            <img className="sr-light-img" src={item.url} alt={item.alt} />
            <div className="sr-field">
              <label className="sr-flabel">
                Alt text{" "}
                <input
                  key={item.id}
                  className="sr-input"
                  defaultValue={item.alt}
                  onBlur={(e) => {
                    if (e.target.value.trim() !== (item.alt ?? ""))
                      void saveAlt(item.id, e.target.value);
                  }}
                />
              </label>
            </div>
            <span className="sr-slug">
              {usage.length > 0
                ? `Used on ${pageCount} page${pageCount > 1 ? "s" : ""}`
                : "Unused"}
            </span>
            <div className="sr-light-actions">
              <button
                type="button"
                className="sr-btn sr-btn-danger"
                aria-label={`delete ${item.alt || item.filename}`}
                onClick={() => void del(item)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
