"use client";
import type { ReactNode } from "react";
import { SectionsProvider } from "sunroom/sections";
import { useContactModal } from "./ContactModalProvider";

export default function SectionsContactBridge({
  children,
}: {
  children: ReactNode;
}) {
  const { open } = useContactModal();
  return <SectionsProvider onContact={open}>{children}</SectionsProvider>;
}
