import type { ValidationIssue } from "../errors.js";
import type { FieldDescriptor, FieldMap } from "./fields.js";

const STRING_TYPES = new Set(["text", "textarea", "richText", "link", "image"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateField(
  field: FieldDescriptor,
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (STRING_TYPES.has(field.type)) {
    if (typeof value !== "string")
      issues.push({ path, message: "expected a string" });
    return;
  }

  switch (field.type) {
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        issues.push({ path, message: "expected a number" });
      }
      return;

    case "boolean":
      if (typeof value !== "boolean")
        issues.push({ path, message: "expected a boolean" });
      return;

    case "select": {
      const allowed = field.options.map((o) => o.value);
      if (typeof value !== "string" || !allowed.includes(value)) {
        issues.push({
          path,
          message: `expected one of: ${allowed.join(", ")}`,
        });
      }
      return;
    }

    case "object":
      if (!isPlainObject(value)) {
        issues.push({ path, message: "expected an object" });
        return;
      }
      walk(field.fields, value, path, issues);
      return;

    case "array":
      if (!Array.isArray(value)) {
        issues.push({ path, message: "expected an array" });
        return;
      }
      value.forEach((item, i) =>
        validateField(field.of, item, `${path}[${i}]`, issues),
      );
      return;
  }
}

function walk(
  fields: FieldMap,
  props: Record<string, unknown>,
  prefix: string,
  issues: ValidationIssue[],
): void {
  for (const [key, field] of Object.entries(fields)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = props[key];

    if (value === undefined || value === null) {
      if (field.required) issues.push({ path, message: "is required" });
      continue;
    }

    validateField(field, value, path, issues);
  }
  // Unknown keys are deliberately ignored: spec §7 requires that renaming a
  // field preserves the old data rather than deleting it. `sunroom check`
  // surfaces them in CI (Phase 7).
}

/** Returns an empty array when `props` is valid against `fields`. */
export function validateProps(
  fields: FieldMap,
  props: unknown,
): ValidationIssue[] {
  if (!isPlainObject(props))
    return [{ path: "", message: "expected an object" }];
  const issues: ValidationIssue[] = [];
  walk(fields, props, "", issues);
  return issues;
}
