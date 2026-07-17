"use client";
import type { FieldDescriptor } from "../../core/fields.js";
import type { ValidationIssue } from "../../errors.js";
import { defaultForField, MAX_FIELD_DEPTH } from "../editor-core.js";

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
    const arr = Array.isArray(value) ? value : [];
    const setAt = (i: number, v: unknown) =>
      onChange(arr.map((it, j) => (j === i ? v : it)));
    const removeAt = (i: number) => onChange(arr.filter((_, j) => j !== i));
    const move = (i: number, d: number) => {
      const j = i + d;
      if (j < 0 || j >= arr.length) return;
      const next = [...arr];
      [next[i], next[j]] = [next[j]!, next[i]!];
      onChange(next);
    };
    return (
      <fieldset>
        <legend>
          {label}
          {err}
        </legend>
        {arr.map((item, i) => (
          <div
            key={i}
            style={{
              borderLeft: "2px solid #eee",
              paddingLeft: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <FieldControl
              name={`${name}[${i}]`}
              field={field.of}
              value={item}
              onChange={(v) => setAt(i, v)}
              path={`${path}[${i}]`}
              issues={issues}
              depth={depth + 1}
            />
            <button
              type="button"
              aria-label={`move up ${i}`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`move down ${i}`}
              disabled={i === arr.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              aria-label={`remove ${i}`}
              onClick={() => removeAt(i)}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange([...arr, defaultForField(field.of, depth + 1)])
          }
        >
          Add
        </button>
      </fieldset>
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

  // richText, image → placeholder (Slice 3 / Phase 6)
  return (
    <label>
      {label}
      {err}{" "}
      <input
        aria-label={name}
        disabled
        value={typeof value === "string" ? value : ""}
        placeholder={`${field.type} — editable in a later slice`}
      />
    </label>
  );
}
