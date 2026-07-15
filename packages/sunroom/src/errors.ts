export interface ValidationIssue {
  /** Dotted path to the offending value, e.g. `quotes[1].quote`. Empty for the root. */
  path: string;
  message: string;
}

export class ValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super(
      issues
        .map((i) => (i.path ? `${i.path}: ${i.message}` : i.message))
        .join("; "),
    );
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/** The page changed underneath the editor. See spec §7, concurrency. */
export class ConflictError extends Error {
  readonly slug: string;

  constructor(slug: string) {
    super(
      `Page "${slug || "home"}" was changed by someone else. Reload and try again.`,
    );
    this.name = "ConflictError";
    this.slug = slug;
  }
}

export class NotFoundError extends Error {
  readonly slug: string;

  constructor(slug: string) {
    super(`Page "${slug || "home"}" does not exist.`);
    this.name = "NotFoundError";
    this.slug = slug;
  }
}
