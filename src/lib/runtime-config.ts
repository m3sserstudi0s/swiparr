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
  basePath: string;
}

/**
 * Server-only function to collect environment variables.
 * This should only be called in Server Components or API routes.
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window !== 'undefined' && window.__SWIPARR_CONFIG__) {
    return window.__SWIPARR_CONFIG__;
  }
  
  const jellyfinPublicUrl = (process.env.JELLYFIN_PUBLIC_URL || process.env.NEXT_PUBLIC_JELLYFIN_PUBLIC_URL || process.env.JELLYFIN_URL || process.env.NEXT_PUBLIC_JELLYFIN_URL || '').replace(/\/$/, '');
  const basePath = (process.env.URL_BASE_PATH || process.env.NEXT_PUBLIC_URL_BASE_PATH || '').replace(/\/$/, '');
  
  return {
    jellyfinPublicUrl,
    useWatchlist: (process.env.JELLYFIN_USE_WATCHLIST || process.env.NEXT_PUBLIC_JELLYFIN_USE_WATCHLIST || '').toLowerCase() === 'true',
    version: (process.env.APP_VERSION || process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version).replace(/^v/i, ''),
    basePath,
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
  return window.__SWIPARR_CONFIG__ || getRuntimeConfig();
}
