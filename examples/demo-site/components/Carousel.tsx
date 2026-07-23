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
      <div className={s.head}>
        {title ? <p className="label">{title}</p> : <span />}
        <div className={s.nav}>
          <button type="button" aria-label="Previous" onClick={() => scroll(-1)} className={s.btn}>
            ←
          </button>
          <button type="button" aria-label="Next" onClick={() => scroll(1)} className={s.btn}>
            →
          </button>
        </div>
      </div>
      <ul ref={track} className={s.track}>
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
    </section>
  );
}
