// Stands in for "next/cache" when `sunroom/actions` is imported from a
// plain Node process (see node-loader.mjs). `revalidatePath()` only makes
// sense inside a live Next request's render cache — this script proves the
// store + git-commit side of the action instead, and the harness proves the
// "public render" side separately by restarting `next start` so it
// cold-loads the same on-disk content over real HTTP.
export function revalidatePath(path, type) {
  console.log(
    `  [stubbed next/cache] revalidatePath(${JSON.stringify(path)}${type ? `, ${JSON.stringify(type)}` : ""})`,
  );
}
