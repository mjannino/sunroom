"use client";
import { useSections } from "./provider.js";

export default function Cta({
  label,
  action,
  href,
}: {
  label?: string;
  action?: string;
  href?: string;
}) {
  const { onContact } = useSections();
  const text = label ?? "Contact";

  return (
    <section className="srs-cta">
      {action === "link" && href ? (
        <a href={href} className="srs-cta-btn">
          {text} →
        </a>
      ) : (
        <button
          type="button"
          className="srs-cta-btn"
          onClick={() => onContact?.()}
        >
          {text} →
        </button>
      )}
    </section>
  );
}
