import type { SunroomConfig } from "../core/registry.js";
import { GitStore } from "./git-store.js";
import type { ContentStore } from "./types.js";

/**
 * One store per content directory, per process.
 *
 * The index lives in memory, so every request in this process must share the
 * same instance. This is also why the app must run as a SINGLE INSTANCE — two
 * containers would each hold their own index and diverge on the first save.
 * See spec §5.
 */
const stores = new Map<string, Promise<ContentStore>>();

export function getStore(config: SunroomConfig): Promise<ContentStore> {
  const existing = stores.get(config.contentDir);
  if (existing) return existing;

  const store = new GitStore(config.contentDir);
  const ready = store.init().then(() => store);
  stores.set(config.contentDir, ready);

  // A failed init must not be cached, or the process is poisoned forever.
  ready.catch(() => stores.delete(config.contentDir));

  return ready;
}

/** Test-only. */
export function resetStores(): void {
  stores.clear();
}
