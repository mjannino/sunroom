"use client";
import { useMedia } from "./MediaContext.js";
import { findMediaUsage } from "../media-usage.js";
import type { MediaItem } from "./types.js";
import type { Settings } from "../../store/types.js";

const NO_SETTINGS: Settings = { seoDefaults: {}, redirects: [] };

/**
 * Delete a media item with the manager's usage-aware confirm: if the image is
 * referenced anywhere, the confirm lists where; otherwise a plain confirm. On
 * OK: deleteMedia → remove from context → onDeleted?.().
 */
export function useMediaDelete(): (
  item: MediaItem,
  onDeleted?: () => void,
) => Promise<void> {
  const { actions, remove, pages, settings } = useMedia();
  return async (item, onDeleted) => {
    const usage = findMediaUsage(pages, settings ?? NO_SETTINGS, item.id);
    const msg =
      usage.length > 0
        ? `Used on: ${usage.map((u) => `${u.slug || "(home)"} (${u.where})`).join(", ")} — delete anyway?`
        : "Delete this image?";
    if (!confirm(msg)) return;
    const res = await actions.deleteMedia(item.id);
    if (res.ok) {
      remove(item.id);
      onDeleted?.();
    }
  };
}
