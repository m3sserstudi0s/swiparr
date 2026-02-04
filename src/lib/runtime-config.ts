/**
 * This file handles the bridge between server-side environment variables
 * and client-side access. It allows using clean env var names (no NEXT_PUBLIC_)
 * in Docker/Compose while still making them available to the browser.
 */

import packageJson from "../../package.json";

import { ProviderCapabilities } from "./providers/types";

export interface RuntimeConfig {
  provider: "jellyfin" | "tmdb" | "plex" | "emby" | string;
  providerLock: boolean;
  capabilities: ProviderCapabilities;
  serverPublicUrl: string;
  useWatchlist: boolean;
  useStaticFilterValues: boolean;
  version: string;
  basePath: string;
}

/**
 * Server-only function to collect environment variables.
 * This should only be called in Server Components or API routes.
 */
export function getRuntimeConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
  if (typeof window !== 'undefined' && window.__SWIPARR_CONFIG__) {
    return window.__SWIPARR_CONFIG__;
  }
  
  const provider = (process.env.PROVIDER || 'jellyfin').toLowerCase();
  const providerLock = (process.env.PROVIDER_LOCK || process.env.SERVER_LOCK || 'true').toLowerCase() === 'true';
  
  // Default capabilities (Jellyfin style)
  const capabilities: ProviderCapabilities = {
    hasAuth: true,
    hasQuickConnect: true,
    hasWatchlist: true,
    hasLibraries: true,
    hasSettings: true,
    requiresServerUrl: true,
    isExperimental: false,
  };

  if (provider === 'tmdb') {
    capabilities.hasAuth = false;
    capabilities.hasQuickConnect = false;
    capabilities.hasWatchlist = false;
    capabilities.hasLibraries = false;
    capabilities.hasSettings = false;
    capabilities.requiresServerUrl = false;
  } else if (provider === 'plex' || provider === 'emby') {
    capabilities.hasQuickConnect = false;
    capabilities.isExperimental = true;
  }
  
  // Jellyfin-specific URLs kept for backwards compatibility
  const serverPublicUrl = (process.env.SERVER_PUBLIC_URL || process.env.SERVER_URL || process.env.JELLYFIN_PUBLIC_URL || process.env.JELLYFIN_URL || '').replace(/\/$/, ''); 
  const rawBasePath = (process.env.URL_BASE_PATH || '').replace(/\/$/, '');
  const basePath = rawBasePath && !rawBasePath.startsWith('/') ? `/${rawBasePath}` : rawBasePath;
  
  return {
    provider,
    providerLock,
    capabilities,
    serverPublicUrl,
    useWatchlist: (process.env.JELLYFIN_USE_WATCHLIST || process.env.USE_WATCHLIST || '').toLowerCase() === 'true',
    useStaticFilterValues: false,
    version: (process.env.APP_VERSION || packageJson.version).replace(/^v/i, ''),
    basePath,
    ...overrides
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
