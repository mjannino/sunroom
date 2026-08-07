"use client";
import Link from "next/link";
import { useContactModal } from "./ContactModalProvider";
import s from "./SiteHeader.module.css";

export default function SiteHeader({
  name,
  header,
}: {
  name?: string;
  header?: { type: "text" | "image"; imageUrl?: string };
}) {
  const { open } = useContactModal();
  return (
    <header className={s.header}>
      <Link href="/" className={s.brand}>
        {header?.type === "image" && header.imageUrl ? (
          <img
            src={header.imageUrl}
            alt={name ?? ""}
            className={s.wordmarkImg}
          />
        ) : (
          <span className={s.wordmark}>{name ?? "Mara Voss"}</span>
        )}
        <span className={s.rec} aria-hidden="true" />
      </Link>
      <nav className={s.nav}>
        <Link href="/credits" className={s.link}>
          Credits
        </Link>
        <Link href="/gear" className={s.link}>
          Gear
        </Link>
        <Link href="/about" className={s.link}>
          About
        </Link>
        <button type="button" className={s.link} onClick={open}>
          Contact
        </button>
        <a
          href="https://instagram.com"
          className={s.link}
          aria-label="Instagram"
          target="_blank"
          rel="noopener noreferrer"
        >
          ⌾
        </a>
      </nav>
    </header>
  );
}
