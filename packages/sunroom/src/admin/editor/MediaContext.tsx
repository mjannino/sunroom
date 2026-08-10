"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MediaActions, MediaItem } from "./types.js";
import type { Page, Settings } from "../../store/types.js";

interface MediaCtx {
  items: MediaItem[];
  actions: MediaActions;
  pages: Page[];
  settings: Settings | undefined;
  add: (item: MediaItem) => void;
  remove: (id: string) => void;
  update: (id: string, patch: { alt: string }) => void;
}
const Ctx = createContext<MediaCtx | null>(null);

export function MediaProvider({
  items: initial,
  actions,
  pages = [],
  settings,
  children,
}: {
  items: MediaItem[];
  actions: MediaActions;
  pages?: Page[];
  settings?: Settings;
  children: ReactNode;
}): React.ReactElement {
  const [items, setItems] = useState(initial);
  const value = useMemo<MediaCtx>(
    () => ({
      items,
      actions,
      pages,
      settings,
      add: (item) => setItems((xs) => [item, ...xs]),
      remove: (id) => setItems((xs) => xs.filter((x) => x.id !== id)),
      update: (id, patch) =>
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    }),
    [items, actions, pages, settings],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMedia(): MediaCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMedia must be used within a MediaProvider");
  return v;
}
