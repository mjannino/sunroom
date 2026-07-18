"use client";
import { useState } from "react";
import { useMedia } from "./MediaContext.js";
import { MediaLibrary } from "./MediaLibrary.js";

interface Props {
  value: unknown;
  onChange: (value: string | undefined) => void;
}

export function ImagePicker({ value, onChange }: Props): React.ReactElement {
  const { items } = useMedia();
  const [open, setOpen] = useState(false);
  const current =
    typeof value === "string"
      ? items.find((item) => item.id === value)
      : undefined;

  return (
    <span>
      {current ? (
        <span>
          <img src={current.url} alt={current.alt} width={80} height={80} />
          <button type="button" onClick={() => setOpen(true)}>
            Replace
          </button>
          <button type="button" onClick={() => onChange(undefined)}>
            Remove
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setOpen(true)}>
          Choose image
        </button>
      )}
      {open ? (
        <MediaLibrary
          onPick={(id) => {
            onChange(id);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </span>
  );
}
