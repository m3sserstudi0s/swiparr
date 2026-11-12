/**
 * This file handles the bridge between server-side environment variables
 * and client-side access. It allows using clean env var names (no NEXT_PUBLIC_)
 * in Docker/Compose while still making them available to the browser.
 */

import { ProviderCapabilities, ProviderType, PROVIDER_CAPABILITIES } from "./providers/types";
import { config } from "./config";
import { DEFAULT_TMDB_REGION } from "./constants";

export interface RuntimeConfig {
  provider: ProviderType;
  providerLock: boolean;
  capabilities: ProviderCapabilities;
  serverPublicUrl: string;
  useWatchlist: boolean;
  version: string;
  basePath: string;
  appPublicUrl: string;
  enableDebug: boolean;
  tmdbDefaultRegion: string;
  useStaticFilters: boolean;
  /** Admin-configured server URL for each provider (may be empty) */
  providerUrls?: {
    jellyfin: string;
    emby: string;
    plex: string;
  };
}


/**
 * Which providers can offer region + streaming-provider settings.
 *
 * Jellyfin gains them when a TMDB token is configured (the hybrid deck). A plain
 * TMDB instance has the same controls: TMDB discover takes `watch_region` and
 * `with_watch_providers` for every catalogue, so hiding the Region dropdown there
 * was a UI limit, not a service one.
 */
export function gainsStreamingSettings(provider: ProviderType, hasTmdbToken: boolean): boolean {
  if (!hasTmdbToken) return false;
  return provider === ProviderType.JELLYFIN || provider === ProviderType.TMDB;
}

/**
 * Capabilities for a provider, adjusted for instance-level configuration.
 * Server-side only source of truth - the client receives the result via
 * window.__MESSER_SWIPE_CONFIG__.
 */
export function getEffectiveCapabilities(provider: ProviderType): ProviderCapabilities {
  const base = PROVIDER_CAPABILITIES[provider] || PROVIDER_CAPABILITIES[ProviderType.JELLYFIN];
  if (gainsStreamingSettings(provider, !!config.TMDB_ACCESS_TOKEN)) {
    return { ...base, hasStreamingSettings: true };
  }
  return base;
}

/**
 * Shared logic to get the config.
 * In the browser, it retrieves from window.__MESSER_SWIPE_CONFIG__.
 * On the server, it uses env vars.
 */
export function getRuntimeConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
  if (typeof window !== 'undefined' && window.__MESSER_SWIPE_CONFIG__) {
    return window.__MESSER_SWIPE_CONFIG__;
  }

  const provider = (overrides?.provider || config.app.provider) as ProviderType;
  const capabilities = getEffectiveCapabilities(provider);

  const providerLock = config.app.providerLock;
  
  return {
    provider,
    providerLock,
    capabilities,
    serverPublicUrl: config.server.publicUrl,
    useWatchlist: config.app.useWatchlist,
    version: config.app.version,
    basePath: config.app.basePath,
    appPublicUrl: config.app.appPublicUrl,
    enableDebug: config.ENABLE_DEBUG,
    tmdbDefaultRegion: config.TMDB_DEFAULT_REGION || DEFAULT_TMDB_REGION,
    useStaticFilters: config.USE_STATIC_FILTERS,
    providerUrls: {
      jellyfin: config.JELLYFIN_URL || '',
      emby: config.EMBY_URL || '',
      plex: config.PLEX_URL || '',
    },
    ...overrides
  };
}

/**
 * Async version of getRuntimeConfig that fetches from DB if not locked.
 * This function uses dynamic imports to ensure database code is never 
 * executed on the client.
 */
/**
 * Client-side global variable to store the config once injected.
 */
declare global {
  interface Window {
    __MESSER_SWIPE_CONFIG__?: RuntimeConfig;
  }
}

/**
 * Hook or function to get config on the client.
 */
export function useRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') {
    return getRuntimeConfig();
  }
  return window.__MESSER_SWIPE_CONFIG__ || getRuntimeConfig();
}
