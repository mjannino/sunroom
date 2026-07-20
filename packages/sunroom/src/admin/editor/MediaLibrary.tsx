"use client";
import { useState, type ChangeEvent } from "react";
import { useMedia } from "./MediaContext.js";
import type { MediaItem } from "./types.js";

interface Props {
  onPick: (id: string) => void;
  onClose: () => void;
}

export function MediaLibrary({ onPick, onClose }: Props): React.ReactElement {
  const { items, actions, add, remove } = useMedia();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const { width, height } = await readImageDimensions(file);

      const uploadRes = await actions.requestUpload(
        file.name,
        file.type,
        file.size,
      );
      if (!uploadRes.ok) {
        setError(uploadRes.message);
        return;
      }

      const putRes = await fetch(uploadRes.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) {
        setError("The upload failed.");
        return;
      }

      const commitRes = await actions.commitMedia({
        storageKey: uploadRes.storageKey,
        filename: file.name,
        mime: file.type,
        width,
        height,
        size: file.size,
        alt: file.name,
      });
      if (!commitRes.ok) {
        setError(commitRes.message);
        return;
      }

      const item: MediaItem = {
        id: commitRes.id,
        url: commitRes.url,
        width,
        height,
        alt: file.name,
        filename: file.name,
      };
      add(item);
    } catch {
      setError("The upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    const res = await actions.deleteMedia(id);
    if (res.ok) remove(id);
  }

  return (
    <div role="dialog" aria-label="Media library" className="sr-dialog">
      <div className="sr-dialog-head">
        <span>Media library</span>
        <button type="button" className="sr-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <label className="sr-upload">
        Upload
        <input
          type="file"
          accept="image/*"
          aria-label="Upload image"
          disabled={uploading}
          onChange={(e) => {
            void handleUpload(e);
          }}
        />
      </label>
      {error ? (
        <p role="alert" className="sr-alert">
          {error}
        </p>
      ) : null}
      <ul className="sr-media-grid">
        {items.map((item) => (
          <li key={item.id} className="sr-media-item">
            <img
              src={item.url}
              alt={item.alt}
              width={80}
              height={80}
              className="sr-media-thumb"
              onClick={() => onPick(item.id)}
            />
            <button
              type="button"
              aria-label={`delete ${item.alt}`}
              className="sr-media-del"
              onClick={() => {
                void handleDelete(item.id);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function readImageDimensions(
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
