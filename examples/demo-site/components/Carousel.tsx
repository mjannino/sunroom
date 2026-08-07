"use client";
import { useRef } from "react";
import Image from "next/image";
import type { ImageValue } from "sunroom";
import s from "./Carousel.module.css";

interface Item {
  image?: ImageValue;
  name?: string;
  note?: string;
}

export default function Carousel({
  title,
  items,
}: {
  title?: string;
  items?: Item[];
}) {
  const track = useRef<HTMLUListElement>(null);

  function scroll(dir: 1 | -1) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const list = items ?? [];
  return (
    <section className={s.section}>
      {title ? <p className="label">{title}</p> : null}
      <div className={s.viewport}>
        <button
          type="button"
          aria-label="Previous"
          className={`${s.btn} ${s.prev}`}
          onClick={() => scroll(-1)}
        >
          ←
        </button>
        <ul
          ref={track}
          className={s.track}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") scroll(1);
            if (e.key === "ArrowLeft") scroll(-1);
          }}
        >
          {list.map((it, i) => (
            <li key={i} className={s.slide}>
              {it.image ? (
                <div className={s.frame}>
                  <Image
                    src={it.image.url}
                    alt={it.image.alt ?? it.name ?? ""}
                    width={it.image.width}
                    height={it.image.height}
                    className={s.img}
                  />
                </div>
              ) : null}
              {it.name ? <p className={s.name}>{it.name}</p> : null}
              {it.note ? <p className={s.note}>{it.note}</p> : null}
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-label="Next"
          className={`${s.btn} ${s.next}`}
          onClick={() => scroll(1)}
        >
          →
        </button>
      </div>
    </section>
  );
}
