import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  basePath: process.env.URL_BASE_PATH || "",
  reactCompiler: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**", // Allow dynamic Jellyfin hosts
      },
    ],
  },
};

export default nextConfig;
