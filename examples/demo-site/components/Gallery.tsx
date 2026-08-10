"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import type { ImageValue } from "sunroom";
import s from "./Gallery.module.css";

export default function Gallery({
  title,
  images,
}: {
  title?: string;
  images?: ImageValue[];
}) {
  const list = (images ?? []).filter(Boolean) as ImageValue[];
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight")
        setOpen((i) => (i === null ? i : Math.min(i + 1, list.length - 1)));
      if (e.key === "ArrowLeft")
        setOpen((i) => (i === null ? i : Math.max(i - 1, 0)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, list.length]);

  if (list.length === 0) return null;
  const openImg = open !== null ? list[open] : undefined;

  return (
    <section className={s.section}>
      {title ? <p className="label">{title}</p> : null}
      <ul className={s.grid}>
        {list.map((img, i) => (
          <li key={i} className={s.cell}>
            <button
              type="button"
              className={s.tile}
              aria-label={`Open image ${i + 1}`}
              onClick={() => setOpen(i)}
            >
              <span className={s.frame}>
                <Image
                  src={img.url}
                  alt={img.alt ?? ""}
                  width={img.width}
                  height={img.height}
                  className={s.thumb}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open !== null && openImg ? (
        <div
          className={s.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            className={s.close}
            aria-label="Close"
            onClick={() => setOpen(null)}
          >
            ✕
          </button>
          {list.length > 1 ? (
            <button
              type="button"
              className={`${s.nav} ${s.prev}`}
              aria-label="Previous"
              disabled={open === 0}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((i) => (i === null ? i : Math.max(i - 1, 0)));
              }}
            >
              ‹
            </button>
          ) : null}
          <Image
            className={s.full}
            src={openImg.url}
            alt={openImg.alt ?? ""}
            width={openImg.width}
            height={openImg.height}
            onClick={(e) => e.stopPropagation()}
          />
          {list.length > 1 ? (
            <button
              type="button"
              className={`${s.nav} ${s.next}`}
              aria-label="Next"
              disabled={open === list.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((i) =>
                  i === null ? i : Math.min(i + 1, list.length - 1),
                );
              }}
            >
              ›
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
