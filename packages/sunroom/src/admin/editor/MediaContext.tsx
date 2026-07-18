"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MediaActions, MediaItem } from "./types.js";

interface MediaCtx {
  items: MediaItem[];
  actions: MediaActions;
  add: (item: MediaItem) => void;
  remove: (id: string) => void;
}
const Ctx = createContext<MediaCtx | null>(null);

export function MediaProvider({
  items: initial,
  actions,
  children,
}: {
  items: MediaItem[];
  actions: MediaActions;
  children: ReactNode;
}): React.ReactElement {
  const [items, setItems] = useState(initial);
  const value = useMemo<MediaCtx>(
    () => ({
      items,
      actions,
      add: (item) => setItems((xs) => [item, ...xs]),
      remove: (id) => setItems((xs) => xs.filter((x) => x.id !== id)),
    }),
    [items, actions],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMedia(): MediaCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMedia must be used within a MediaProvider");
  return v;
}
