import type { ReactNode } from "react";
import ContactModalProvider from "@/components/ContactModalProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Public-site chrome. Lives in the (site) route group so it wraps only public
// pages, never /admin. The ContactModalProvider makes the modal reachable from
// both the header's Contact button and any Cta section.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <ContactModalProvider>
      <SiteHeader />
      <main style={{ maxWidth: "var(--measure)", margin: "0 auto", padding: "0 2rem" }}>
        {children}
      </main>
      <SiteFooter />
    </ContactModalProvider>
  );
}
