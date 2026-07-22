"use client";
import { toEmbedSrc, type EmbedProvider } from "../lib/embed";
import s from "./Embed.module.css";

export default function Embed({
  provider,
  url,
  title,
}: {
  provider?: EmbedProvider;
  url?: string;
  title?: string;
}) {
  const src = provider && url ? toEmbedSrc(provider, url) : null;
  if (!src) return null;

  return (
    <section className={s.section}>
      {title ? <p className="label">{title}</p> : null}
      <div className={s.frame}>
        <iframe
          src={src}
          title={title ?? "Player"}
          loading="lazy"
          allow="encrypted-media; clipboard-write; fullscreen; picture-in-picture"
          className={s.iframe}
        />
      </div>
    </section>
  );
}
