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
}


/**
 * Shared logic to get the config.
 * In the browser, it retrieves from window.__SWIPARR_CONFIG__.
 * On the server, it uses env vars.
 */
export function getRuntimeConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
  if (typeof window !== 'undefined' && window.__SWIPARR_CONFIG__) {
    return window.__SWIPARR_CONFIG__;
  }

  const provider = (overrides?.provider || config.app.provider) as ProviderType;
  const capabilities = PROVIDER_CAPABILITIES[provider] || PROVIDER_CAPABILITIES[ProviderType.JELLYFIN];

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
