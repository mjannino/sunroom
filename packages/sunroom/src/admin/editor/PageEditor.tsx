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
import { SortableList, SortableRow } from "./Sortable.js";
import type { EditorActions, SerializedRegistry } from "./types.js";

export function PageEditor({
  page: initial,
  version,
  registry,
  actions,
}: {
  page: Page;
  version: string;
  registry: SerializedRegistry;
  actions: EditorActions;
}): React.ReactElement {
  const [page, setPage] = useState(initial);
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
      setDirty(false);
      setStatus("Saved.");
      setPreviewKey((k) => k + 1);
    } else {
      setStatus(res.message);
    }
  }

  return (
    <div data-screen="editor" style={{ display: "flex", gap: "2rem" }}>
      <aside style={{ minWidth: 220 }}>
        <h2>{page.title}</h2>
        <SortableList
          ids={page.sections.map((s) => s.id)}
          onReorder={(orderedIds) =>
            dispatch({ type: "reorderSections", orderedIds })
          }
        >
          <ol>
            {page.sections.map((s, i) => (
              <li key={s.id}>
                <SortableRow id={s.id}>
                  <button
                    onClick={() => setSelected(s.id)}
                    style={{ fontWeight: s.id === selected ? 700 : 400 }}
                  >
                    {registry[s.type]?.label ?? s.type}
                  </button>
                  {sectionIssues(s).length > 0 ? (
                    <span aria-label="has errors" title="has errors">
                      ⚠
                    </span>
                  ) : null}
                  <button
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
                    onClick={() => {
                      if (confirm("Remove this section?"))
                        dispatch({ type: "removeSection", sectionId: s.id });
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
          open={paletteOpen}
          onToggle={(e) => setPaletteOpen(e.currentTarget.open)}
        >
          <summary>+ Add section</summary>
          {paletteOpen
            ? Object.entries(registry)
                .filter(([, d]) => !d.deprecated)
                .map(([type, d]) => (
                  <button
                    key={type}
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
                ))
            : null}
        </details>
      </aside>

      <main style={{ flex: 1 }}>
        <fieldset>
          <legend>Page</legend>
          <label>
            Title{" "}
            <input
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
            <span role="alert" style={{ color: "crimson" }}>
              Title is required
            </span>
          ) : null}
          <label>
            SEO title{" "}
            <input
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
          <label>
            SEO description{" "}
            <input
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
        </fieldset>

        {section && schema ? (
          <fieldset>
            <legend>{schema.label}</legend>
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

        <button onClick={save} disabled={!canSave}>
          Save
        </button>
        {status ? <span role="status">{status}</span> : null}

        <button type="button" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Hide" : "Show"} preview
        </button>
        {showPreview ? (
          <iframe
            key={previewKey}
            src={previewSrc}
            title="Preview"
            style={{ width: "100%", height: 480, border: "1px solid #ddd" }}
          />
        ) : null}
      </main>
    </div>
  );
}
