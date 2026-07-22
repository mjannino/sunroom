"use client";
import { useContactModal } from "./ContactModalProvider";
import s from "./Cta.module.css";

export default function Cta({
  label,
  action,
  href,
}: {
  label?: string;
  action?: string;
  href?: string;
}) {
  const { open } = useContactModal();
  const text = label ?? "Contact";

  return (
    <section className={s.section}>
      {action === "link" && href ? (
        <a href={href} className={s.btn}>{text} →</a>
      ) : (
        <button type="button" className={s.btn} onClick={open}>{text} →</button>
      )}
    </section>
  );
}
