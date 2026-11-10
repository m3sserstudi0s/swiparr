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

// Legacy hostnames that permanently redirect to APP_PUBLIC_URL. This is hosting
// policy, not product behaviour, so it is opt-in per deployment: the Vercel
// project sets LEGACY_REDIRECT_FROM=swiparr.com,www.swiparr.com, and a
// self-hosted instance inherits no redirect for a domain it does not serve.
// Both values are read at build time, so changing them needs a redeploy.
const LEGACY_HOSTS = (process.env.LEGACY_REDIRECT_FROM ?? "")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);
const CANONICAL_URL = (process.env.APP_PUBLIC_URL ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  output: "standalone",
  assetPrefix: BASE_PATH || undefined,
  async redirects() {
    if (!CANONICAL_URL || LEGACY_HOSTS.length === 0) {
      return [];
    }
    return LEGACY_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `${CANONICAL_URL}/:path*`,
      statusCode: 301,
    }));
  },
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
          // Content-Security-Policy is set at runtime in proxy.ts (middleware)
          // so it can read CSP_FRAME_ANCESTORS from Docker runtime env vars.
          // next.config.ts headers() runs AFTER middleware in Next.js and would
          // overwrite the runtime CSP, so it is intentionally omitted here.
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
