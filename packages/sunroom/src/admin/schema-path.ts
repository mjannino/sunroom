import { dirname, join } from "node:path";
/** The schema file path: explicit env, else a sibling of the content dir
 *  (OUTSIDE the git content repo so `git clean -fd` in the store never wipes it). */
export function resolveSchemaPath(contentDir: string): string {
  return (
    process.env.SUNROOM_SCHEMA_PATH ??
    join(dirname(contentDir), ".sunroom-schema.json")
  );
}
