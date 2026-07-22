"use client";
import { useMemo, useState } from "react";
import type { Page, SectionInstance } from "../../store/types.js";
import type { ValidationIssue } from "../../errors.js";
import {
  defaultProps,
  editorValidate,
  editReducer,
  type EditAction,
} from "../editor-core.js";
import { FieldControl } from "./FieldControl.js";
import { MediaProvider } from "./MediaContext.js";
import { SortableList, SortableRow } from "./Sortable.js";
import type {
  EditorActions,
  MediaActions,
  MediaItem,
  SerializedRegistry,
} from "./types.js";

export function PageEditor({
  page: initial,
  version,
  registry,
  actions,
  media,
  mediaActions,
}: {
  page: Page;
  version: string;
  registry: SerializedRegistry;
  actions: EditorActions;
  media: MediaItem[];
  mediaActions: MediaActions;
}): React.ReactElement {
  const [page, setPage] = useState(initial);
  // The last applied (saved) page — the target that "Revert" restores to.
  const [basePage, setBasePage] = useState(initial);
  const [baseVersion, setBaseVersion] = useState(version);
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const dispatch = (action: EditAction) => {
    setPage((p) => editReducer(p, action));
    setDirty(true);
    setStatus(null);
  };

  const section = page.sections.find((s) => s.id === selected) ?? null;
  const schema = section ? registry[section.type] : undefined;

  const sectionIssuesFor = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>();
    for (const s of page.sections)
      map.set(
        s.id,
        registry[s.type]
          ? editorValidate(registry[s.type]!.fields, s.props)
          : [],
      );
    return map;
  }, [page, registry]);
  const sectionIssues = (s: SectionInstance) =>
    sectionIssuesFor.get(s.id) ?? [];
  const anyInvalid = page.sections.some((s) => sectionIssues(s).length > 0);
  const titleEmpty = page.title.trim() === "";
  const canSave = dirty && !busy && !anyInvalid && !titleEmpty;
  const selectedIssues = section ? sectionIssues(section) : [];
  const previewSrc = page.slug === "" ? "/" : `/${page.slug}`;

  async function save() {
    setBusy(true);
    const res = await actions.savePage(page, baseVersion);
    setBusy(false);
    if (res.ok) {
      if (res.version) setBaseVersion(res.version);
      setBasePage(page);
      setDirty(false);
      setStatus("Applied.");
      setPreviewKey((k) => k + 1);
    } else {
      setStatus(res.message);
    }
  }

  function revert() {
    setPage(basePage);
    setSelected(null);
    setDirty(false);
    setStatus(null);
  }

  return (
    <MediaProvider items={media} actions={mediaActions}>
      <div data-screen="editor" className="sr-screen">
        <div className="sr-edhead">
          <button
            className="sr-btn sr-btn-primary"
            onClick={save}
            disabled={!canSave}
          >
            Apply changes
          </button>
          {dirty ? (
            <button
              type="button"
              className="sr-btn"
              onClick={revert}
              disabled={busy}
            >
              Revert
            </button>
          ) : null}
          {dirty ? <span className="sr-pending">Unapplied changes</span> : null}
          {status ? (
            <span role="status" className="sr-chip">
              {status}
            </span>
          ) : null}
          <button
            type="button"
            className="sr-btn"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "Hide" : "Show"} preview
          </button>
        </div>

        <div className="sr-cols">
          <aside className="sr-col sr-col-sections">
            <h2 className="sr-title">{page.title}</h2>
            <div className="sr-col-label">Sections</div>
            <SortableList
              ids={page.sections.map((s) => s.id)}
              onReorder={(orderedIds) =>
                dispatch({ type: "reorderSections", orderedIds })
              }
            >
              <ol className="sr-seclist">
                {page.sections.map((s, i) => (
                  <li key={s.id}>
                    <SortableRow
                      id={s.id}
                      label={registry[s.type]?.label ?? s.type}
                      className={`sr-secrow${s.id === selected ? " is-active" : ""}`}
                    >
                      <button
                        className="sr-secrow-label"
                        onClick={() => setSelected(s.id)}
                      >
                        {registry[s.type]?.label ?? s.type}
                      </button>
                      {sectionIssues(s).length > 0 ? (
                        <span
                          className="sr-secrow-warn"
                          aria-label="has errors"
                          title="has errors"
                        >
                          ⚠
                        </span>
                      ) : null}
                      <button
                        className="sr-btn sr-btn-icon"
                        disabled={i === 0}
                        onClick={() =>
                          dispatch({
                            type: "moveSection",
                            sectionId: s.id,
                            dir: "up",
                          })
                        }
                      >
                        ↑
                      </button>
                      <button
                        className="sr-btn sr-btn-icon"
                        disabled={i === page.sections.length - 1}
                        onClick={() =>
                          dispatch({
                            type: "moveSection",
                            sectionId: s.id,
                            dir: "down",
                          })
                        }
                      >
                        ↓
                      </button>
                      <button
                        className="sr-btn sr-btn-icon"
                        onClick={() => {
                          if (confirm("Remove this section?"))
                            dispatch({
                              type: "removeSection",
                              sectionId: s.id,
                            });
                        }}
                      >
                        ✕
                      </button>
                    </SortableRow>
                  </li>
                ))}
              </ol>
            </SortableList>
            <details
              className="sr-menu-wrap"
              open={paletteOpen}
              onToggle={(e) => setPaletteOpen(e.currentTarget.open)}
            >
              <summary className="sr-btn sr-menu-trigger">
                + Add section
              </summary>
              {paletteOpen ? (
                <div className="sr-menu" role="menu">
                  <div className="sr-menu-label">Add a section</div>
                  {Object.entries(registry)
                    .filter(([, d]) => !d.deprecated)
                    .map(([type, d]) => (
                      <button
                        key={type}
                        type="button"
                        role="menuitem"
                        className="sr-menu-item"
                        onClick={() => {
                          const id = crypto.randomUUID();
                          dispatch({
                            type: "addSection",
                            sectionType: type,
                            id,
                            props: defaultProps(d.fields),
                          });
                          setSelected(id);
                          setPaletteOpen(false);
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                </div>
              ) : null}
            </details>
          </aside>

          <main className="sr-col">
            <fieldset className="sr-fieldset">
              <legend className="sr-legend">Page</legend>
              <div className="sr-field">
                <label className="sr-flabel">
                  Title{" "}
                  <input
                    className="sr-input"
                    value={page.title}
                    onChange={(e) =>
                      dispatch({
                        type: "setPageField",
                        key: "title",
                        value: e.target.value,
                      })
                    }
                  />
                </label>
                {page.title.trim() === "" ? (
                  <span role="alert" className="sr-error">
                    Title is required
                  </span>
                ) : null}
              </div>
              <div className="sr-field">
                <label className="sr-flabel">
                  SEO title{" "}
                  <input
                    className="sr-input"
                    value={page.seo.title ?? ""}
                    onChange={(e) =>
                      dispatch({
                        type: "setPageField",
                        key: "seo.title",
                        value: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <div className="sr-field">
                <label className="sr-flabel">
                  SEO description{" "}
                  <input
                    className="sr-input"
                    value={page.seo.description ?? ""}
                    onChange={(e) =>
                      dispatch({
                        type: "setPageField",
                        key: "seo.description",
                        value: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </fieldset>

            {section && schema ? (
              <fieldset key={section.id} className="sr-fieldset">
                <legend className="sr-legend">{schema.label}</legend>
                {Object.entries(schema.fields).map(([key, field]) => (
                  <FieldControl
                    key={key}
                    name={key}
                    field={field}
                    value={section.props[key]}
                    onChange={(value) =>
                      dispatch({
                        type: "setSectionField",
                        sectionId: section.id,
                        key,
                        value,
                      })
                    }
                    path={key}
                    issues={selectedIssues}
                    depth={0}
                  />
                ))}
              </fieldset>
            ) : (
              <p>Select or add a section to edit it.</p>
            )}
          </main>

          {showPreview ? (
            <div className="sr-col sr-col-preview">
              <div className="sr-col-label">Live preview</div>
              <div className="sr-preview">
                <iframe
                  key={previewKey}
                  src={previewSrc}
                  title="Preview"
                  className="sr-preview-frame"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </MediaProvider>
  );
}
