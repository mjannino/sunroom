"use client";
import { useSections } from "./provider.js";

export function ContactButton({ label }: { label?: string }) {
  const { onContact } = useSections();
  return (
    <button
      type="button"
      className="srs-prose-cta"
      onClick={() => onContact?.()}
    >
      {label ?? "Contact"} →
    </button>
  );
}
