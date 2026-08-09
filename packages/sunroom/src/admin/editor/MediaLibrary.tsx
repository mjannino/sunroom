"use client";
import type { ChangeEvent } from "react";
import { useMedia } from "./MediaContext.js";
import { useMediaUpload } from "./use-media-upload.js";

interface Props {
  onPick: (id: string) => void;
  onClose: () => void;
}

export function MediaLibrary({ onPick, onClose }: Props): React.ReactElement {
  const { items, actions, remove } = useMedia();
  const { uploads, uploadFiles } = useMediaUpload();
  const uploading = uploads.some((u) => u.status === "uploading");
  const error = uploads.find((u) => u.status === "error")?.message ?? null;

  function handleUpload(e: ChangeEvent<HTMLInputElement>): void {
    const files = e.target.files;
    e.target.value = ""; // allow re-selecting the same file later
    if (!files || files.length === 0) return;
    uploadFiles(files);
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
          onChange={handleUpload}
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
            <button
              type="button"
              className="sr-media-thumb"
              aria-label={`Use ${item.alt}`}
              onClick={() => onPick(item.id)}
            >
              <img src={item.url} alt={item.alt} width={80} height={80} />
            </button>
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
