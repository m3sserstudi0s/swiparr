/**
 * This file handles the bridge between server-side environment variables
 * and client-side access. It allows using clean env var names (no NEXT_PUBLIC_)
 * in Docker/Compose while still making them available to the browser.
 */

import packageJson from "../../package.json";
import { ProviderCapabilities, ProviderType, PROVIDER_CAPABILITIES } from "./providers/types";
import { config } from "./config";
import { getActiveProvider, getUseStaticFilterValues } from "./server/admin";

export interface RuntimeConfig {
  provider: ProviderType;
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

  const provider = (overrides?.provider || config.app.provider) as ProviderType;
  const capabilities = PROVIDER_CAPABILITIES[provider] || PROVIDER_CAPABILITIES[ProviderType.JELLYFIN];

  return {
    provider,
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
 * Async version of getRuntimeConfig that fetches from DB if not locked.
 * Only usable in Server Components or API routes.
 */
export async function getAsyncRuntimeConfig(): Promise<RuntimeConfig> {
    const [provider, useStaticFilterValues] = await Promise.all([
        getActiveProvider(),
        getUseStaticFilterValues()
    ]);

    return getRuntimeConfig({ 
        provider: provider as ProviderType,
        useStaticFilterValues 
    });
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
