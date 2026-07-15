export interface SelectOption {
  label: string;
  value: string;
}

/** What a component receives for an `f.image()` field, once Phase 6 resolves it. */
export interface ImageValue {
  url: string;
  width: number;
  height: number;
  alt?: string;
}

interface Base {
  label?: string;
  required?: boolean;
}

type TextOpts = Base & { default?: string };
type NumberOpts = Base & { default?: number };
type BooleanOpts = Base & { default?: boolean };
type SelectOpts = Base & { options: SelectOption[]; default?: string };

export type FieldDescriptor =
  | ({ type: "text" } & TextOpts)
  | ({ type: "textarea" } & TextOpts)
  | ({ type: "richText" } & TextOpts)
  | ({ type: "link" } & TextOpts)
  | ({ type: "image" } & Base)
  | ({ type: "number" } & NumberOpts)
  | ({ type: "boolean" } & BooleanOpts)
  | ({ type: "select" } & SelectOpts)
  | ({ type: "object"; fields: FieldMap } & Base)
  | ({ type: "array"; of: FieldDescriptor } & Base);

export type FieldMap = Record<string, FieldDescriptor>;

const empty = {} as never;

export const f = {
  text: <const O extends TextOpts = Record<string, never>>(o?: O) =>
    ({ type: "text", ...(o ?? empty) }) as { type: "text" } & O,
  textarea: <const O extends TextOpts = Record<string, never>>(o?: O) =>
    ({ type: "textarea", ...(o ?? empty) }) as { type: "textarea" } & O,
  richText: <const O extends TextOpts = Record<string, never>>(o?: O) =>
    ({ type: "richText", ...(o ?? empty) }) as { type: "richText" } & O,
  link: <const O extends TextOpts = Record<string, never>>(o?: O) =>
    ({ type: "link", ...(o ?? empty) }) as { type: "link" } & O,
  image: <const O extends Base = Record<string, never>>(o?: O) =>
    ({ type: "image", ...(o ?? empty) }) as { type: "image" } & O,
  number: <const O extends NumberOpts = Record<string, never>>(o?: O) =>
    ({ type: "number", ...(o ?? empty) }) as { type: "number" } & O,
  boolean: <const O extends BooleanOpts = Record<string, never>>(o?: O) =>
    ({ type: "boolean", ...(o ?? empty) }) as { type: "boolean" } & O,
  select: <const O extends SelectOpts>(o: O) =>
    ({ type: "select", ...o }) as { type: "select" } & O,
  object: <
    const M extends FieldMap,
    const O extends Base = Record<string, never>,
  >(
    fields: M,
    o?: O,
  ) =>
    ({ type: "object", fields, ...(o ?? empty) }) as {
      type: "object";
      fields: M;
    } & O,
  array: <
    const I extends FieldDescriptor,
    const O extends Base = Record<string, never>,
  >(
    of: I,
    o?: O,
  ) => ({ type: "array", of, ...(o ?? empty) }) as { type: "array"; of: I } & O,
};

type ValueOf<F> = F extends {
  type: "text" | "textarea" | "richText" | "link" | "select";
}
  ? string
  : F extends { type: "number" }
    ? number
    : F extends { type: "boolean" }
      ? boolean
      : F extends { type: "image" }
        ? ImageValue
        : F extends { type: "object"; fields: infer M }
          ? M extends FieldMap
            ? InferFields<M>
            : never
          : F extends { type: "array"; of: infer I }
            ? ValueOf<I>[]
            : never;

type RequiredKeys<M> = {
  [K in keyof M]: M[K] extends { required: true } ? K : never;
}[keyof M];

type OptionalKeys<M> = Exclude<keyof M, RequiredKeys<M>>;

type Merge<M extends FieldMap> = {
  [K in RequiredKeys<M>]: ValueOf<M[K]>;
} & {
  [K in OptionalKeys<M>]?: ValueOf<M[K]>;
};

// Flatten the required/optional intersection into a single object type.
// Without this, `Merge<M>` is structurally assignable to (and from) the
// flattened shape but not recognized as *identical* by strict type-equality
// checks (e.g. `expectTypeOf().toEqualTypeOf()`) once it's nested inside
// another type (like an array element) — the raw intersection doesn't get
// simplified the way it does at a top-level indexed access.
export type InferFields<M extends FieldMap> = {
  [K in keyof Merge<M>]: Merge<M>[K];
};
