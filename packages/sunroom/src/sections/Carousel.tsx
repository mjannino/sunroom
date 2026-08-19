"use client";
import { useRef } from "react";
import Image from "next/image";
import type { ImageValue } from "../core/fields.js";

interface CarouselItem {
  image?: ImageValue;
  name?: string;
  note?: string;
}

export default function Carousel({
  title,
  items,
}: {
  title?: string;
  items?: CarouselItem[];
}) {
  const track = useRef<HTMLUListElement>(null);

  function scroll(dir: 1 | -1) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const list = items ?? [];
  return (
    <section className="srs-carousel">
      {title ? <p className="srs-label">{title}</p> : null}
      <div className="srs-carousel-viewport">
        <button
          type="button"
          aria-label="Previous"
          className="srs-carousel-btn srs-carousel-prev"
          onClick={() => scroll(-1)}
        >
          ←
        </button>
        <ul
          ref={track}
          className="srs-carousel-track"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") scroll(1);
            if (e.key === "ArrowLeft") scroll(-1);
          }}
        >
          {list.map((it, i) => (
            <li key={i} className="srs-carousel-slide">
              {it.image ? (
                <div className="srs-carousel-frame">
                  <Image
                    src={it.image.url}
                    alt={it.image.alt ?? it.name ?? ""}
                    width={it.image.width}
                    height={it.image.height}
                    className="srs-carousel-img"
                  />
                </div>
              ) : null}
              {it.name ? <p className="srs-carousel-name">{it.name}</p> : null}
              {it.note ? <p className="srs-carousel-note">{it.note}</p> : null}
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-label="Next"
          className="srs-carousel-btn srs-carousel-next"
          onClick={() => scroll(1)}
        >
          →
        </button>
      </div>
    </section>
  );
}
