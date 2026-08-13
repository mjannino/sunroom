"use client";
import Image from "next/image";
import type { ImageValue } from "../core/fields.js";

export default function Hero({
  image,
  text,
  placement = "overlay",
}: {
  image: ImageValue;
  text?: string;
  placement?: string;
}) {
  const frame = image ? (
    <div className="srs-hero-frame">
      <Image
        src={image.url}
        alt={image.alt ?? ""}
        width={image.width}
        height={image.height}
        className="srs-hero-img"
        priority
      />
      {placement === "overlay" && text ? (
        <p className="srs-label srs-hero-overlay">{text}</p>
      ) : null}
    </div>
  ) : null;

  return (
    <section className="srs-hero">
      {placement === "above" && text ? (
        <p className="srs-label">{text}</p>
      ) : null}
      {frame}
    </section>
  );
}
