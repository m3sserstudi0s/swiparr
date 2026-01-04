/**
 * This file handles the bridge between server-side environment variables
 * and client-side access. It allows using clean env var names (no NEXT_PUBLIC_)
 * in Docker/Compose while still making them available to the browser.
 */

import packageJson from "../../package.json";

export type MediaBackend = 'jellyfin' | 'plex';

export interface RuntimeConfig {
  jellyfinPublicUrl: string;
  plexPublicUrl: string;
  useWatchlist: boolean;
  version: string;
  backend: MediaBackend;
}

/**
 * Detect which backend to use based on environment variables.
 */
function detectBackend(): MediaBackend {
  // Explicit setting takes priority
  const explicit = process.env.MEDIA_BACKEND || process.env.NEXT_PUBLIC_MEDIA_BACKEND;
  if (explicit === 'plex') return 'plex';
  if (explicit === 'jellyfin') return 'jellyfin';
  
  // Auto-detect based on which URL is set
  if (process.env.PLEX_URL || process.env.NEXT_PUBLIC_PLEX_URL) return 'plex';
  if (process.env.JELLYFIN_URL || process.env.NEXT_PUBLIC_JELLYFIN_URL) return 'jellyfin';
  
  // Default to plex for this fork
  return 'plex';
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
  const plexPublicUrl = (process.env.PLEX_PUBLIC_URL || process.env.NEXT_PUBLIC_PLEX_PUBLIC_URL || process.env.PLEX_URL || process.env.NEXT_PUBLIC_PLEX_URL || '').replace(/\/$/, '');
  
  return {
    jellyfinPublicUrl,
    plexPublicUrl,
    useWatchlist: (process.env.JELLYFIN_USE_WATCHLIST || process.env.NEXT_PUBLIC_JELLYFIN_USE_WATCHLIST || '').toLowerCase() === 'true',
    version: (process.env.APP_VERSION || process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version).replace(/^v/i, ''),
    backend: detectBackend(),
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
