export const VERSION = "0.0.0";

// Authoring
export { createSunroom } from "./sunroom.js";
export type { AdminRouteProps, Sunroom, SunroomRouteProps } from "./sunroom.js";
export {
  defineSection,
  resolveConfig,
  DEFAULT_CONTENT_DIR,
} from "./core/registry.js";
export type {
  SectionDefinition,
  SunroomConfig,
  SunroomInput,
} from "./core/registry.js";
export { f } from "./core/fields.js";
export type {
  FieldDescriptor,
  FieldMap,
  ImageValue,
  InferFields,
  SelectOption,
} from "./core/fields.js";

// Validation
export { validateProps } from "./core/validate.js";
export { ConflictError, NotFoundError, ValidationError } from "./errors.js";
export type { ValidationIssue } from "./errors.js";

// Store — exported for the admin (Phase 5) and for tooling
export { GitStore, SYSTEM_AUTHOR } from "./store/git-store.js";
export { getStore, resetStores } from "./store/singleton.js";
export { validatePageShape } from "./store/validate-page.js";
export {
  HOME_SLUG,
  RESERVED_SLUGS,
  paramsToSlug,
  pathToSlug,
  slugToParams,
  slugToPath,
  validateSlug,
} from "./store/paths.js";
export { DEFAULT_SETTINGS } from "./store/types.js";
export type {
  Author,
  ContentStore,
  MediaRecord,
  Page,
  PageEntry,
  PageSeo,
  PageSummary,
  SaveOptions,
  SectionInstance,
  Settings,
} from "./store/types.js";

// Rendering
export { Sections } from "./render/sections.js";
export type { SectionsProps } from "./render/sections.js";

// Admin / auth
export { createHandlers } from "./admin/handlers.js";
export type { SunroomHandlers } from "./admin/handlers.js";
export { AdminLayout, SignInScreen } from "./admin/components.js";
export { getSession } from "./admin/session-server.js";
export { getAuthConfig, AuthConfigError } from "./admin/config.js";
export type { AuthConfig } from "./admin/config.js";
export type { SessionPayload } from "./admin/session.js";
