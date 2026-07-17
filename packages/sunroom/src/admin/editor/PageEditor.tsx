"use client";
import { useState } from "react";
import type { Page } from "../../store/types.js";
import { defaultProps, editReducer, type EditAction } from "../editor-core.js";
import { FieldControl } from "./FieldControl.js";
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

  const dispatch = (action: EditAction) => {
    setPage((p) => editReducer(p, action));
    setDirty(true);
    setStatus(null);
  };

  const section = page.sections.find((s) => s.id === selected) ?? null;
  const schema = section ? registry[section.type] : undefined;

  async function save() {
    setBusy(true);
    const res = await actions.savePage(page, baseVersion);
    setBusy(false);
    if (res.ok) {
      if (res.version) setBaseVersion(res.version);
      setDirty(false);
      setStatus("Saved.");
    } else {
      setStatus(res.message);
    }
  }

  return (
    <div data-screen="editor" style={{ display: "flex", gap: "2rem" }}>
      <aside style={{ minWidth: 220 }}>
        <h2>{page.title}</h2>
        <ol>
          {page.sections.map((s, i) => (
            <li key={s.id}>
              <button
                onClick={() => setSelected(s.id)}
                style={{ fontWeight: s.id === selected ? 700 : 400 }}
              >
                {registry[s.type]?.label ?? s.type}
              </button>
              <button
                disabled={i === 0}
                onClick={() =>
                  dispatch({ type: "moveSection", sectionId: s.id, dir: "up" })
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
            </li>
          ))}
        </ol>
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
                issues={[]}
                depth={0}
              />
            ))}
          </fieldset>
        ) : (
          <p>Select or add a section to edit it.</p>
        )}

        <button onClick={save} disabled={!dirty || busy}>
          Save
        </button>
        {status ? <span role="status">{status}</span> : null}
      </main>
    </div>
  );
}
