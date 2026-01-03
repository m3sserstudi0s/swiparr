import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**", // Allow dynamic Jellyfin hosts
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    // This helps with Next.js 15 CSRF protection behind reverse proxies
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
};

export default nextConfig;
