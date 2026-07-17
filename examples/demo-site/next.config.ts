import type { NextConfig } from "next";

// serverExternalPackages removed: Next must process `sunroom` so its
// 'use server' actions get action IDs registered. The git store's node
// builtins (node:child_process, node:fs) stay external automatically.
const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.R2_PUBLIC_HOST ?? "cdn.example.com",
      },
    ],
  },
};

export default config;
