"use client";
import { useState } from "react";
import type { PageSummary } from "../../store/types.js";
import type { EditorActions } from "./types.js";

export function PagesScreen({
  pages,
  actions,
}: {
  pages: PageSummary[];
  actions: EditorActions;
}): React.ReactElement {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(
    fn: () => Promise<{ ok: boolean; message?: string; reason?: string }>,
  ): Promise<{ ok: boolean; message?: string; reason?: string }> {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) setError(res.message ?? "Something went wrong.");
    return res;
  }

  return (
    <div data-screen="pages">
      <h1 className="sr-title">Pages</h1>
      <ul className="sr-seclist">
        {pages.map((p, i) => (
          <li key={p.slug || "(home)"} className="sr-secrow">
            <a className="sr-page" href={`/admin/pages/${p.slug}`}>
              {p.title}
            </a>{" "}
            <code className="sr-slug">/{p.slug}</code>
            <button
              className="sr-btn-icon"
              disabled={busy || i === 0}
              onClick={() =>
                run(() => actions.reorderPages(move(pages, i, -1)))
              }
            >
              ↑
            </button>
            <button
              className="sr-btn-icon"
              disabled={busy || i === pages.length - 1}
              onClick={() => run(() => actions.reorderPages(move(pages, i, 1)))}
            >
              ↓
            </button>
            <button
              className="sr-btn-icon sr-btn-danger"
              aria-label={`delete ${p.title}`}
              disabled={busy || p.slug === ""}
              onClick={() => {
                if (confirm(`Delete "${p.title}"?`))
                  run(() => actions.deletePage(p.slug));
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <h2>New page</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => actions.createPage({ slug, title })).then((res) => {
            if (res.ok) {
              setSlug("");
              setTitle("");
            }
          });
        }}
      >
        <label>
          Title{" "}
          <input
            className="sr-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Slug{" "}
          <input
            className="sr-input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </label>
        <button className="sr-btn-primary" type="submit" disabled={busy}>
          Create
        </button>
      </form>

      {error ? (
        <p className="sr-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function move(pages: PageSummary[], i: number, delta: number): string[] {
  const order = pages.map((p) => p.slug);
  const j = i + delta;
  [order[i], order[j]] = [order[j]!, order[i]!];
  return order;
}
