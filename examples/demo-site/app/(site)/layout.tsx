import type { ReactNode } from "react";
import Nav from "@/components/Nav";

// Public-site chrome: the nav + main content wrapper. Because this lives in the
// (site) route group, it wraps only the public pages, NOT /admin.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  );
}
