import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;
