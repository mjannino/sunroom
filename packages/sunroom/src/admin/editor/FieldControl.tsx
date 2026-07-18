"use client";
import { useEffect, useRef, useState } from "react";
import type { FieldDescriptor } from "../../core/fields.js";
import type { ValidationIssue } from "../../errors.js";
import { defaultForField, MAX_FIELD_DEPTH } from "../editor-core.js";
import { ImagePicker } from "./ImagePicker.js";
import { RichTextControl } from "./RichTextControl.js";
import { SortableList, SortableRow } from "./Sortable.js";

interface Props {
  name: string;
  field: FieldDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  path: string;
  issues: ValidationIssue[];
  depth: number;
}

export function FieldControl({
  name,
  field,
  value,
  onChange,
  path,
  issues,
  depth,
}: Props): React.ReactElement {
  if (depth > MAX_FIELD_DEPTH) {
    return <p role="alert">Field nesting too deep (max {MAX_FIELD_DEPTH}).</p>;
  }

  const label = field.label ?? name;
  const error = issues.find((i) => i.path === path);
  const err = error ? (
    <span role="alert" style={{ color: "crimson", marginLeft: "0.5rem" }}>
      {error.message}
    </span>
  ) : null;

  // Composite: object
  if (field.type === "object") {
    const obj = (
      typeof value === "object" && value !== null ? value : {}
    ) as Record<string, unknown>;
    return (
      <fieldset>
        <legend>
          {label}
          {err}
        </legend>
        {Object.entries(field.fields).map(([subKey, subField]) => (
          <FieldControl
            key={subKey}
            name={subKey}
            field={subField}
            value={obj[subKey]}
            onChange={(v) => onChange({ ...obj, [subKey]: v })}
            path={`${path}.${subKey}`}
            issues={issues}
            depth={depth + 1}
          />
        ))}
      </fieldset>
    );
  }

  // Composite: array
  if (field.type === "array") {
    return (
      <ArrayControl
        name={name}
        field={field}
        value={value}
        onChange={onChange}
        path={path}
        issues={issues}
        depth={depth}
      />
    );
  }

  // Scalars
  if (field.type === "textarea") {
    return (
      <label>
        {label}
        {err}{" "}
        <textarea
          aria-label={name}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }
  if (field.type === "text" || field.type === "link") {
    const type = field.type === "link" ? "url" : "text";
    return (
      <label>
        {label}
        {err}{" "}
        <input
          type={type}
          aria-label={name}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }
  if (field.type === "number") {
    return (
      <label>
        {label}
        {err}{" "}
        <input
          type="number"
          aria-label={name}
          value={typeof value === "number" ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      </label>
    );
  }
  if (field.type === "boolean") {
    return (
      <label>
        {label}
        {err}{" "}
        <input
          type="checkbox"
          aria-label={name}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <label>
        {label}
        {err}{" "}
        <select
          aria-label={name}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "richText") {
    return (
      <label>
        {label}
        {err}
        <RichTextControl
          value={value}
          onChange={(html) => onChange(html)}
          ariaLabel={name}
        />
      </label>
    );
  }

  if (field.type === "image") {
    // Not a <label>: an image field's control is a cluster of buttons
    // (Choose/Replace/Remove) plus a thumbnail, not a single labelable
    // element — wrapping them in <label> makes some accessible-name
    // implementations fold the label text into EVERY nested button's
    // computed name, making "Replace" and "Remove" both match a
    // `/remove/i` query.
    return (
      <div>
        <span>{label}</span>
        {err}
        <ImagePicker value={value} onChange={(v) => onChange(v)} />
      </div>
    );
  }

  // Exhaustive: every FieldDescriptor variant is handled above.
  field satisfies never;
  throw new Error(`Unhandled field type: ${(field as FieldDescriptor).type}`);
}

interface ArrayEntry {
  id: string;
  value: unknown;
}

function ArrayControl({
  name,
  field,
  value,
  onChange,
  path,
  issues,
  depth,
}: Props & {
  field: Extract<FieldDescriptor, { type: "array" }>;
}): React.ReactElement {
  // Transient {id, value} list; the PERSISTED value is items.map(e => e.value).
  const [items, setItems] = useState<ArrayEntry[]>(() => toItems(value));
  // The last plain array we emitted, so we can tell OUR change from an external one.
  const lastEmitted = useRef<unknown[]>(items.map((e) => e.value));

  // Reconcile only when `value` changed from an EXTERNAL cause (not our own emit):
  // e.g. a remount with different content, or a future undo. Our own emits set
  // lastEmitted, so this effect no-ops for them.
  useEffect(() => {
    const incoming = Array.isArray(value) ? value : [];
    const prev = lastEmitted.current;
    const same =
      incoming.length === prev.length &&
      incoming.every((v, i) => v === prev[i]);
    if (!same) {
      setItems(toItems(incoming));
      lastEmitted.current = incoming;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (next: ArrayEntry[]) => {
    setItems(next);
    const plain = next.map((e) => e.value);
    lastEmitted.current = plain; // mark as OUR change so the effect doesn't rebuild ids
    onChange(plain);
  };

  const label = field.label ?? name;
  const error = issues.find((i) => i.path === path);
  const err = error ? (
    <span role="alert" style={{ color: "crimson", marginLeft: "0.5rem" }}>
      {error.message}
    </span>
  ) : null;

  const atMaxDepth = depth + 1 > MAX_FIELD_DEPTH;

  return (
    <fieldset>
      <legend>
        {label}
        {err}
      </legend>
      <SortableList
        ids={items.map((e) => e.id)}
        onReorder={(orderedIds) =>
          emit(orderedIds.map((id) => items.find((e) => e.id === id)!))
        }
      >
        {items.map((entry, i) => (
          <SortableRow key={entry.id} id={entry.id} label={`item ${i + 1}`}>
            <div
              data-testid={`array-item-${entry.id}`}
              style={{
                borderLeft: "2px solid #eee",
                paddingLeft: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <FieldControl
                name={`${name}[${i}]`}
                field={field.of}
                value={entry.value}
                onChange={(v) =>
                  emit(items.map((e, j) => (j === i ? { ...e, value: v } : e)))
                }
                path={`${path}[${i}]`}
                issues={issues}
                depth={depth + 1}
              />
              <button
                type="button"
                aria-label={`move up ${i}`}
                disabled={i === 0}
                onClick={() => emit(swap(items, i, i - 1))}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`move down ${i}`}
                disabled={i === items.length - 1}
                onClick={() => emit(swap(items, i, i + 1))}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`remove ${i}`}
                onClick={() => emit(items.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          </SortableRow>
        ))}
      </SortableList>
      <button
        type="button"
        disabled={atMaxDepth}
        onClick={() => {
          if (atMaxDepth) return;
          emit([
            ...items,
            { id: newId(), value: defaultForField(field.of, depth + 1) },
          ]);
        }}
      >
        Add
      </button>
    </fieldset>
  );
}

function toItems(value: unknown): ArrayEntry[] {
  return (Array.isArray(value) ? value : []).map((v) => ({
    id: newId(),
    value: v,
  }));
}

function swap<T>(a: T[], i: number, j: number): T[] {
  if (j < 0 || j >= a.length) return a;
  const n = [...a];
  [n[i], n[j]] = [n[j]!, n[i]!];
  return n;
}

let _seq = 0;
function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `item-${_seq++}`;
}
