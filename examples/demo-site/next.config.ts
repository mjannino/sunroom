import type { NextConfig } from "next";

// serverExternalPackages removed: Next must process `sunroom` so its
// 'use server' actions get action IDs registered. The git store's node
// builtins (node:child_process, node:fs) stay external automatically.
const config: NextConfig = {
  images: {
    // Serve R2 images directly (no server-side transcode) so the public
    // /_next/image optimizer can't be replayed to saturate the single CPU or
    // amplify R2/egress cost (review finding #2). Revisit if a CDN front-door
    // is added later.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.R2_PUBLIC_HOST ?? "cdn.example.com",
      },
    ],
  },
};

export default config;
