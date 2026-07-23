import type { ReactNode } from "react";
import { Newsreader, Space_Mono } from "next/font/google";
import "./globals.css";

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

// Root layout: only the html/body shell. Site chrome (nav, main) lives in the
// (site) route group so it never wraps /admin — the admin route renders its own
// self-contained dark shell directly under <body>. The font *variables* are set
// on <html> (harmless CSS vars); .sr-admin overrides font-family itself.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
