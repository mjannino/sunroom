import type { NextConfig } from "next";

const config: NextConfig = {
  // The store shells out to git and reads the filesystem; it must not be bundled.
  serverExternalPackages: ["sunroom"],
};

export default config;
