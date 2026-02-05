/**
 * This file handles the bridge between server-side environment variables
 * and client-side access. It allows using clean env var names (no NEXT_PUBLIC_)
 * in Docker/Compose while still making them available to the browser.
 */

import packageJson from "../../package.json";

import { ProviderCapabilities } from "./providers/types";

import { config } from "./config";

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

  if (config.app.provider === 'tmdb') {
    capabilities.hasAuth = false;
    capabilities.hasQuickConnect = false;
    capabilities.hasWatchlist = false;
    capabilities.hasLibraries = false;
    capabilities.hasSettings = false;
    capabilities.requiresServerUrl = false;
  } else if (config.app.provider === 'plex' || config.app.provider === 'emby') {
    capabilities.hasQuickConnect = false;
    capabilities.isExperimental = true;
  }

  return {
    provider: config.app.provider,
    providerLock: config.app.providerLock,
    capabilities,
    serverPublicUrl: config.server.publicUrl,
    useWatchlist: config.app.useWatchlist,
    useStaticFilterValues: false,
    version: config.app.version,
    basePath: config.app.basePath,
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
