"use client";
import { useEffect, useState } from "react";
import type { PageSummary } from "../../store/types.js";
import { NewPageDialog } from "./NewPageDialog.js";
import type { EditorActions } from "./types.js";

export function PagesScreen({
  pages,
  actions,
}: {
  pages: PageSummary[];
  actions: EditorActions;
}): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("new"))
      setShowNew(true);
  }, []);

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
    <div data-screen="pages" className="sr-screen">
      <h1 className="sr-title">Pages</h1>
      <ul className="sr-seclist">
        {pages.map((p, i) => (
          <li key={p.slug || "(home)"} className="sr-secrow">
            <a className="sr-page" href={`/admin/pages/${p.slug}`}>
              {p.title}
            </a>{" "}
            <code className="sr-slug">/{p.slug}</code>
            <button
              className="sr-btn sr-btn-icon"
              disabled={busy || i === 0}
              onClick={() =>
                run(() => actions.reorderPages(move(pages, i, -1)))
              }
            >
              ↑
            </button>
            <button
              className="sr-btn sr-btn-icon"
              disabled={busy || i === pages.length - 1}
              onClick={() => run(() => actions.reorderPages(move(pages, i, 1)))}
            >
              ↓
            </button>
            <button
              className="sr-btn sr-btn-icon sr-btn-danger"
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

      <button
        className="sr-btn sr-btn-primary"
        disabled={busy}
        onClick={() => setShowNew(true)}
      >
        New page
      </button>
      <NewPageDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={actions.createPage}
      />

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
