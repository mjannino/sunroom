"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import ContactModal from "./ContactModal";

const Ctx = createContext<{ open: () => void }>({ open: () => {} });

export function useContactModal() {
  return useContext(Ctx);
}

export default function ContactModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Ctx.Provider value={{ open: () => setIsOpen(true) }}>
      {children}
      {isOpen ? <ContactModal onClose={() => setIsOpen(false)} /> : null}
    </Ctx.Provider>
  );
}
