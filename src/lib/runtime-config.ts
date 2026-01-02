/**
 * This file handles the bridge between server-side environment variables
 * and client-side access. It allows using clean env var names (no NEXT_PUBLIC_)
 * in Docker/Compose while still making them available to the browser.
 */

import packageJson from "../../package.json";

export interface RuntimeConfig {
  jellyfinPublicUrl: string;
  useWatchlist: boolean;
  version: string;
}

// Default values for development
const DEFAULT_CONFIG: RuntimeConfig = {
  jellyfinPublicUrl: '',
  useWatchlist: false,
  version: packageJson.version,
};

/**
 * Server-only function to collect environment variables.
 * This should only be called in Server Components or API routes.
 */
export function getRuntimeConfig(): RuntimeConfig {
  return {
    jellyfinPublicUrl: process.env.JELLYFIN_PUBLIC_URL || process.env.NEXT_PUBLIC_JELLYFIN_PUBLIC_URL || '',
    useWatchlist: (process.env.JELLYFIN_USE_WATCHLIST || process.env.NEXT_PUBLIC_JELLYFIN_USE_WATCHLIST) === 'true',
    version: process.env.APP_VERSION || process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version,
  };
}

/**
 * Client-side global variable to store the config once injected.
 */
declare global {
  interface Window {
    __SWIPARR_CONFIG__?: RuntimeConfig;
  }
}

/**
 * Hook or function to get config on the client.
 */
export function useRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') {
    return getRuntimeConfig();
  }
  return window.__SWIPARR_CONFIG__ || DEFAULT_CONFIG;
}
