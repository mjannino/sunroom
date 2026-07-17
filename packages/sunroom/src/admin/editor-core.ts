import type { FieldDescriptor, FieldMap } from "../core/fields.js";
import type { SunroomConfig } from "../core/registry.js";
import { paramsToSlug } from "../store/paths.js";
import type { Page, SectionInstance } from "../store/types.js";
import type { SerializedRegistry } from "./editor/types.js";
import type { ValidationIssue } from "../errors.js";
import { validateProps } from "../core/validate.js";

export const MAX_FIELD_DEPTH = 5;

export function defaultForField(field: FieldDescriptor, depth = 0): unknown {
  if (depth > MAX_FIELD_DEPTH) {
    throw new Error(
      `field nesting exceeds max depth (${MAX_FIELD_DEPTH}) — check for a circular field descriptor`,
    );
  }
  if ("default" in field && field.default !== undefined) return field.default;
  switch (field.type) {
    case "text":
    case "textarea":
    case "richText":
    case "link":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "select":
      return field.options[0]?.value ?? "";
    case "image":
      return undefined;
    case "object":
      return defaultProps(field.fields, depth + 1);
    case "array":
      return [];
  }
}

export function defaultProps(
  fields: FieldMap,
  depth = 0,
): Record<string, unknown> {
  if (depth > MAX_FIELD_DEPTH) {
    throw new Error(
      `field nesting exceeds max depth (${MAX_FIELD_DEPTH}) — check for a circular field descriptor`,
    );
  }
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields))
    out[key] = defaultForField(field, depth);
  return out;
}

export function serializeRegistry(config: SunroomConfig): SerializedRegistry {
  const out: SerializedRegistry = {};
  for (const [type, def] of Object.entries(config.sections)) {
    out[type] = {
      label: def.label,
      thumbnail: def.thumbnail,
      deprecated: def.deprecated,
      fields: def.fields,
    };
  }
  return out;
}

export function screenFromSegments(
  segments: string[] | undefined,
): { screen: "pages" } | { screen: "editor"; slug: string } {
  const seg = segments ?? [];
  if (seg.length === 0) return { screen: "pages" };
  if (seg[0] === "pages")
    return { screen: "editor", slug: paramsToSlug(seg.slice(1)) };
  return { screen: "pages" };
}

export type EditAction =
  | { type: "setSectionField"; sectionId: string; key: string; value: unknown }
  | {
      type: "setPageField";
      key: "title" | "seo.title" | "seo.description";
      value: string;
    }
  | {
      type: "addSection";
      sectionType: string;
      id: string;
      props: Record<string, unknown>;
    }
  | { type: "removeSection"; sectionId: string }
  | { type: "moveSection"; sectionId: string; dir: "up" | "down" }
  | { type: "reorderSections"; orderedIds: string[] };

export function editReducer(page: Page, action: EditAction): Page {
  switch (action.type) {
    case "setSectionField":
      return {
        ...page,
        sections: page.sections.map((s) =>
          s.id === action.sectionId
            ? { ...s, props: { ...s.props, [action.key]: action.value } }
            : s,
        ),
      };
    case "setPageField":
      if (action.key === "title") return { ...page, title: action.value };
      if (action.key === "seo.title")
        return { ...page, seo: { ...page.seo, title: action.value } };
      return { ...page, seo: { ...page.seo, description: action.value } };
    case "addSection":
      return {
        ...page,
        sections: [
          ...page.sections,
          { id: action.id, type: action.sectionType, props: action.props },
        ],
      };
    case "removeSection":
      return {
        ...page,
        sections: page.sections.filter((s) => s.id !== action.sectionId),
      };
    case "moveSection": {
      const i = page.sections.findIndex((s) => s.id === action.sectionId);
      if (i < 0) return page;
      const j = action.dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= page.sections.length) return page;
      const sections = [...page.sections];
      [sections[i], sections[j]] = [sections[j]!, sections[i]!];
      return { ...page, sections };
    }
    case "reorderSections": {
      const byId = new Map(page.sections.map((s) => [s.id, s]));
      const ordered = action.orderedIds
        .map((id) => byId.get(id))
        .filter((s): s is SectionInstance => !!s);
      const rest = page.sections.filter(
        (s) => !action.orderedIds.includes(s.id),
      );
      return { ...page, sections: [...ordered, ...rest] };
    }
  }
}

const STRING_TYPES = new Set(["text", "textarea", "richText", "link", "image"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isEmptyForRequired(field: FieldDescriptor, value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (STRING_TYPES.has(field.type)) return value === "";
  if (field.type === "array") return Array.isArray(value) && value.length === 0;
  return false; // 0, false, a select value, an object are all "present"
}

function walkRequired(
  fields: FieldMap,
  props: Record<string, unknown>,
  prefix: string,
  issues: ValidationIssue[],
): void {
  for (const [key, field] of Object.entries(fields)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = props[key];
    if (field.required && isEmptyForRequired(field, value)) {
      issues.push({ path, message: "is required" });
      continue;
    }
    if (field.type === "object" && isPlainObject(value)) {
      walkRequired(field.fields, value, path, issues);
    } else if (field.type === "array" && Array.isArray(value)) {
      const of = field.of;
      value.forEach((item, i) => {
        const itemPath = `${path}[${i}]`;
        if (of.type === "object" && isPlainObject(item)) {
          walkRequired(of.fields, item, itemPath, issues);
        } else if (of.required && isEmptyForRequired(of, item)) {
          issues.push({ path: itemPath, message: "is required" });
        }
      });
    }
  }
}

/** validateProps + required-empty strictness (editor UX layer; does NOT modify validateProps). */
export function editorValidate(
  fields: FieldMap,
  props: unknown,
): ValidationIssue[] {
  const base = validateProps(fields, props);
  const required: ValidationIssue[] = [];
  walkRequired(fields, isPlainObject(props) ? props : {}, "", required);
  const seen = new Set(base.map((i) => i.path));
  return [...base, ...required.filter((i) => !seen.has(i.path))];
}
