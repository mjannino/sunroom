"use client";
import { useState } from "react";
import type { EditorActions } from "./types.js";

export function NewPageDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: EditorActions["createPage"];
}): React.ReactElement | null {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await onCreate({
      slug,
      title,
      seo: { title: seoTitle, description: seoDesc },
    });
    setBusy(false);
    if (res.ok) onClose();
    else if (!res.ok) setError(res.message);
  }

  return (
    <div
      className="sr-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="New page"
    >
      <form className="sr-dialog" onSubmit={submit}>
        <div className="sr-dialog-head">
          <strong>New page</strong>
          <button
            type="button"
            className="sr-btn sr-btn-icon"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="sr-field">
          <label className="sr-flabel">
            Title{" "}
            <input
              className="sr-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        </div>
        <div className="sr-field">
          <label className="sr-flabel">
            Slug{" "}
            <input
              className="sr-input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
        </div>
        <div className="sr-field">
          <label className="sr-flabel">
            SEO title{" "}
            <input
              className="sr-input"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
            />
          </label>
        </div>
        <div className="sr-field">
          <label className="sr-flabel">
            SEO description{" "}
            <input
              className="sr-input"
              value={seoDesc}
              onChange={(e) => setSeoDesc(e.target.value)}
            />
          </label>
        </div>
        {error ? (
          <p className="sr-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="sr-btn sr-btn-primary" type="submit" disabled={busy}>
          Create
        </button>
      </form>
    </div>
  );
}
