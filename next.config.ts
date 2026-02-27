import type { NextConfig } from "next";

// URL_BASE_PATH must be set at build time (via Docker --build-arg) so that
// Next.js can bake the correct prefix into /_next/static asset URLs.
// At runtime, the proxy (src/proxy.ts) strips this prefix from incoming
// requests so internal Next.js routes remain at their canonical paths.
const BASE_PATH = (() => {
  const raw = process.env.URL_BASE_PATH ?? "";
  const stripped = raw.replace(/\/$/, "");
  return stripped && !stripped.startsWith("/") ? `/${stripped}` : stripped;
})();

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  output: "standalone",
  assetPrefix: BASE_PATH || undefined,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Strict Content-Security-Policy (M5).
            // 'unsafe-inline' for styles is required by Tailwind CSS v4 / Next.js inline
            // style injection; 'unsafe-eval' is intentionally omitted.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://plex.tv https://*.plex.direct wss://*.plex.direct https://api.themoviedb.org https://image.tmdb.org",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  images: {
    unoptimized: false,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
