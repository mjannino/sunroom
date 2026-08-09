"use client";
import { useState } from "react";
import { useMedia } from "./MediaContext.js";
import type { MediaItem } from "./types.js";

export interface UploadRow {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  message?: string;
}

let _seq = 0;
const rowId = () => `up-${_seq++}`;

export function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the image."));
    };
    img.src = objectUrl;
  });
}

export function useMediaUpload(): {
  uploads: UploadRow[];
  uploadFiles: (files: FileList | File[]) => void;
} {
  const { actions, add } = useMedia();
  const [uploads, setUploads] = useState<UploadRow[]>([]);

  const setRow = (id: string, patch: Partial<UploadRow>) =>
    setUploads((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );

  async function uploadOne(file: File, id: string): Promise<void> {
    try {
      const { width, height } = await readImageDimensions(file).catch(() => ({
        width: 0,
        height: 0,
      }));
      const up = await actions.requestUpload(file.name, file.type, file.size);
      if (!up.ok) return setRow(id, { status: "error", message: up.message });
      const put = await fetch(up.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok)
        return setRow(id, { status: "error", message: "The upload failed." });
      const commit = await actions.commitMedia({
        storageKey: up.storageKey,
        filename: file.name,
        mime: file.type,
        width,
        height,
        size: file.size,
        alt: file.name,
      });
      if (!commit.ok)
        return setRow(id, { status: "error", message: commit.message });
      const item: MediaItem = {
        id: commit.id,
        url: commit.url,
        width,
        height,
        alt: file.name,
        filename: file.name,
      };
      add(item);
      setRow(id, { status: "done" });
    } catch {
      setRow(id, { status: "error", message: "The upload failed." });
    }
  }

  function uploadFiles(files: FileList | File[]): void {
    const list = Array.from(files);
    const rows = list.map((f) => ({
      id: rowId(),
      name: f.name,
      status: "uploading" as const,
    }));
    setUploads(rows); // replace, not prepend — a new batch clears prior rows/errors
    void Promise.allSettled(list.map((f, i) => uploadOne(f, rows[i]!.id)));
  }

  return { uploads, uploadFiles };
}
