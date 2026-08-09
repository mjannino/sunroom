import type { ReactElement } from "react";
import type { PageSummary } from "../../store/types.js";

export function Sidebar({
  pages,
  activeSlug,
  activeScreen,
}: {
  pages: PageSummary[];
  activeSlug: string | null;
  activeScreen: "pages" | "editor" | "settings" | "media";
}): ReactElement {
  return (
    <nav className="sr-side" aria-label="Admin navigation">
      <div className="sr-nav-label">Manage</div>
      <a
        className={`sr-nav-item${activeScreen === "pages" ? " is-active" : ""}`}
        href="/admin"
      >
        <span className="sr-nav-ic" />
        Pages
      </a>
      <a
        className={`sr-nav-item${activeScreen === "media" ? " is-active" : ""}`}
        href="/admin/media"
      >
        <span className="sr-nav-ic" />
        Media
      </a>
      <a
        className={`sr-nav-item${activeScreen === "settings" ? " is-active" : ""}`}
        href="/admin/settings"
      >
        <span className="sr-nav-ic" />
        Settings
      </a>
      <div className="sr-pagelist">
        <div className="sr-nav-label">Pages</div>
        {pages.map((p) => (
          <a
            key={p.slug || "(home)"}
            className={`sr-page${activeScreen === "editor" && p.slug === activeSlug ? " is-active" : ""}`}
            href={`/admin/pages/${p.slug}`}
          >
            {p.title}
            {p.slug === "" ? (
              <span className="sr-home-dot" title="home">
                ☀
              </span>
            ) : null}
          </a>
        ))}
        <a className="sr-newpage" href="/admin?new">
          + New page
        </a>
      </div>
    </nav>
  );
}
