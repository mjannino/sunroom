"use client";
import { useState } from "react";
import type { Settings } from "../../store/types.js";
import type { ActionResult } from "./types.js";

export function SettingsScreen({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (s: Settings) => Promise<ActionResult>;
}): React.ReactElement {
  const [name, setName] = useState(settings.site?.name ?? "");
  const [tagline, setTagline] = useState(settings.site?.tagline ?? "");
  const [madeWith, setMadeWith] = useState(settings.site?.madeWith !== false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setStatus(null);
    const res = await onSave({
      ...settings,
      site: { name, tagline, madeWith },
    });
    setBusy(false);
    setStatus(res.ok ? "Saved." : res.message);
  }

  return (
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
        <div className="sr-field">
          <label className="sr-flabel">
            <input
              type="checkbox"
              checked={madeWith}
              onChange={(e) => setMadeWith(e.target.checked)}
            />{" "}
            Show &ldquo;made with Sunroom&rdquo; on sign-in
          </label>
        </div>
      </fieldset>
      <button className="sr-btn sr-btn-primary" onClick={save} disabled={busy}>
        Save
      </button>
      {status ? (
        <span role="status" className="sr-chip">
          {status}
        </span>
      ) : null}
    </div>
  );
}
