"use client";

import { useContactModal } from "./ContactModalProvider";

export default function ContactLink({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { open } = useContactModal();
  return (
    <button type="button" className={className} onClick={open}>
      {label ?? "Contact"} →
    </button>
  );
}
