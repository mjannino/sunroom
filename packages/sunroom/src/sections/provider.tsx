"use client";
import { createContext, useContext, type ReactNode } from "react";

interface SectionsCtx {
  onContact?: () => void;
}
const Ctx = createContext<SectionsCtx>({});

export function SectionsProvider({
  onContact,
  children,
}: {
  onContact?: () => void;
  children: ReactNode;
}): React.ReactElement {
  return <Ctx.Provider value={{ onContact }}>{children}</Ctx.Provider>;
}

export function useSections(): SectionsCtx {
  return useContext(Ctx);
}
