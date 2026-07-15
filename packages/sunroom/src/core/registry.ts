import type { ComponentType } from "react";
import type { FieldMap, InferFields } from "./fields.js";

export interface SectionDefinition<M extends FieldMap = FieldMap> {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  fields: M;
  /** Public path to a preview image shown in the client's Add Section palette. */
  thumbnail?: string;
  /** Hidden from the palette, but existing instances still render. See spec §7. */
  deprecated?: boolean;
}

/**
 * Registers a component as an editable section.
 *
 * `component` is typed as `ComponentType<InferFields<M>>`, so if the component's
 * props and the declared fields disagree, this is a compile error — not a
 * runtime surprise on a client's live page.
 */
export function defineSection<const M extends FieldMap>(def: {
  label: string;
  fields: M;
  component: ComponentType<InferFields<M>>;
  thumbnail?: string;
  deprecated?: boolean;
}): SectionDefinition<M> {
  return def as unknown as SectionDefinition<M>;
}

export interface SunroomInput {
  /** Defaults to $SUNROOM_CONTENT_DIR, then './.sunroom-content'. */
  contentDir?: string;
  sections: Record<string, SectionDefinition<FieldMap>>;
}

export interface SunroomConfig {
  contentDir: string;
  sections: Record<string, SectionDefinition<FieldMap>>;
}

export const DEFAULT_CONTENT_DIR = "./.sunroom-content";

export function resolveConfig(input: SunroomInput): SunroomConfig {
  return {
    contentDir:
      input.contentDir ??
      process.env.SUNROOM_CONTENT_DIR ??
      DEFAULT_CONTENT_DIR,
    sections: input.sections,
  };
}
