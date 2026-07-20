import type { ReactElement } from "react";
import type { PageSummary } from "../../store/types.js";

export function Sidebar({
  pages,
  activeSlug,
  activeScreen,
}: {
  pages: PageSummary[];
  activeSlug: string | null;
  activeScreen: "pages" | "editor";
}): ReactElement {
  return (
    <nav className="sr-side" aria-label="Admin navigation">
      <div className="sr-nav-label">Manage</div>
      <a className={`sr-nav-item${activeScreen === "pages" ? " is-active" : ""}`} href="/admin">
        <span className="sr-nav-ic" />Pages
      </a>
      <span className="sr-nav-item is-disabled" aria-disabled="true">
        <span className="sr-nav-ic" />Media<span className="sr-soon">Soon</span>
      </span>
      <span className="sr-nav-item is-disabled" aria-disabled="true">
        <span className="sr-nav-ic" />Settings<span className="sr-soon">Soon</span>
      </span>
      <div className="sr-pagelist">
        <div className="sr-nav-label">Pages</div>
        {pages.map((p) => (
          <a
            key={p.slug || "(home)"}
            className={`sr-page${activeScreen === "editor" && p.slug === activeSlug ? " is-active" : ""}`}
            href={`/admin/pages/${p.slug}`}
          >
            {p.title}
            {p.slug === "" ? <span className="sr-home-dot" title="home">☀</span> : null}
          </a>
        ))}
        <a className="sr-newpage" href="/admin">+ New page</a>
      </div>
    </nav>
  );
}
