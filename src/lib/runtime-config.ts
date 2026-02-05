/**
 * This file handles the bridge between server-side environment variables
 * and client-side access. It allows using clean env var names (no NEXT_PUBLIC_)
 * in Docker/Compose while still making them available to the browser.
 */

import packageJson from "../../package.json";
import { ProviderCapabilities, ProviderType, PROVIDER_CAPABILITIES } from "./providers/types";
import { config } from "./config";

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
    useStaticFilterValues: !!overrides?.useStaticFilterValues,
    version: config.app.version,
    basePath: config.app.basePath,
    ...overrides
  };
}

/**
 * Async version of getRuntimeConfig that fetches from DB if not locked.
 * This function uses dynamic imports to ensure database code is never 
 * executed on the client.
 */
export async function getAsyncRuntimeConfig(): Promise<RuntimeConfig> {
    // Only fetch from DB if we are on the server
    if (typeof window === 'undefined') {
        // We use a dynamic import to avoid static analysis pulling the server code into client bundles
        const [admin, sessionLib, { cookies }, { getIronSession }, { getSessionOptions }] = await Promise.all([
            import("./server/admin"),
            import("./server/auth-resolver"),
            import("next/headers"),
            import("iron-session"),
            import("./session")
        ]);

        const cookieStore = await cookies();
        const session = await getIronSession<any>(cookieStore, await getSessionOptions());

        let provider: string | undefined;

        if (session?.user?.provider) {
            provider = session.user.provider;
        } else if (!config.app.providerLock) {
            provider = await admin.getActiveProvider();
        } else {
            provider = config.app.provider;
        }

        const useStaticFilterValues = await admin.getUseStaticFilterValues();

        return getRuntimeConfig({ 
            provider: provider as ProviderType,
            useStaticFilterValues 
        });
    }

    return getRuntimeConfig();
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
