import type { ReactNode } from "react";
import "./globals.css";

// Root layout: only the html/body shell. Site chrome (nav, main padding) lives
// in the (site) route group so it never wraps /admin — the admin route renders
// its own self-contained dark shell directly under <body>.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
