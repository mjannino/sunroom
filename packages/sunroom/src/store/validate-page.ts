import type { ValidationIssue } from "../errors.js";
import { validateSlug } from "./paths.js";
import type { Page } from "./types.js";

/**
 * Structural validation of a page document.
 *
 * Deliberately knows nothing about the component registry — the store must be
 * testable with no React in sight. Field-level validation of section props is
 * `validateProps` in core, called by the admin before it ever reaches here.
 */
export function validatePageShape(page: Page): ValidationIssue[] {
  const issues: ValidationIssue[] = [...validateSlug(page.slug)];

  if (typeof page.title !== "string" || page.title.trim() === "") {
    issues.push({ path: "title", message: "is required" });
  }

  if (typeof page.position !== "number" || !Number.isFinite(page.position)) {
    issues.push({ path: "position", message: "expected a number" });
  }

  if (!Array.isArray(page.sections)) {
    issues.push({ path: "sections", message: "expected an array" });
    return issues;
  }

  const seen = new Set<string>();
  page.sections.forEach((section, i) => {
    if (typeof section.id !== "string" || section.id === "") {
      issues.push({ path: `sections[${i}].id`, message: "is required" });
    } else if (seen.has(section.id)) {
      issues.push({
        path: `sections[${i}].id`,
        message: `duplicate id "${section.id}"`,
      });
    } else {
      seen.add(section.id);
    }

    if (typeof section.type !== "string" || section.type === "") {
      issues.push({ path: `sections[${i}].type`, message: "is required" });
    }

    if (
      typeof section.props !== "object" ||
      section.props === null ||
      Array.isArray(section.props)
    ) {
      issues.push({
        path: `sections[${i}].props`,
        message: "expected an object",
      });
    }
  });

  return issues;
}
