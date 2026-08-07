"use client";
import { useState } from "react";
import type { Settings } from "../../store/types.js";
import type { ActionResult, MediaActions, MediaItem } from "./types.js";
import { MediaProvider } from "./MediaContext.js";
import { ImagePicker } from "./ImagePicker.js";

export function SettingsScreen({
  settings,
  onSave,
  media,
  mediaActions,
}: {
  settings: Settings;
  onSave: (s: Settings) => Promise<ActionResult>;
  media: MediaItem[];
  mediaActions: MediaActions;
}): React.ReactElement {
  const [name, setName] = useState(settings.site?.name ?? "");
  const [tagline, setTagline] = useState(settings.site?.tagline ?? "");
  const [headerType, setHeaderType] = useState<"text" | "image">(
    settings.site?.header?.type ?? "text",
  );
  const [headerImage, setHeaderImage] = useState<string | undefined>(
    settings.site?.header?.image,
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setStatus(null);
    const header =
      headerType === "image"
        ? { type: "image" as const, image: headerImage }
        : { type: "text" as const };
    const res = await onSave({ ...settings, site: { name, tagline, header } });
    setBusy(false);
    setStatus(res.ok ? "Saved." : res.message);
  }

  return (
    <MediaProvider items={media} actions={mediaActions}>
      <div data-screen="settings" className="sr-screen">
        <h1 className="sr-title">Settings</h1>
        <fieldset className="sr-fieldset">
          <legend className="sr-legend">Site identity</legend>
          <div className="sr-field">
            <label className="sr-flabel">
              Site name{" "}
              <input
                className="sr-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </div>
          <div className="sr-field">
            <label className="sr-flabel">
              Tagline{" "}
              <input
                className="sr-input"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </label>
          </div>
        </fieldset>
        <fieldset className="sr-fieldset">
          <legend className="sr-legend">Website header</legend>
          <div className="sr-field">
            <label className="sr-flabel">
              Website header{" "}
              <select
                className="sr-input"
                value={headerType}
                onChange={(e) =>
                  setHeaderType(e.target.value as "text" | "image")
                }
              >
                <option value="text">Text (site name)</option>
                <option value="image">Image</option>
              </select>
            </label>
          </div>
          {headerType === "image" ? (
            <div className="sr-field">
              <span className="sr-flabel">Header image</span>
              <ImagePicker
                value={headerImage}
                onChange={(v) => setHeaderImage(v)}
              />
            </div>
          ) : null}
        </fieldset>
        <button
          className="sr-btn sr-btn-primary"
          onClick={save}
          disabled={busy}
        >
          Save
        </button>
        {status ? (
          <span role="status" className="sr-chip">
            {status}
          </span>
        ) : null}
      </div>
    </MediaProvider>
  );
}
