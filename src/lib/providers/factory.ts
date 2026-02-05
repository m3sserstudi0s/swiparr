import { getRuntimeConfig } from "@/lib/runtime-config";
import { MediaProvider, ProviderType } from "./types";
import { JellyfinProvider } from "./jellyfin/index";
import { TmdbProvider } from "./tmdb/index";
import { PlexProvider } from "./plex/index";
import { EmbyProvider } from "./emby/index";

class ProviderFactory {
  private static instance: MediaProvider;

  static getProvider(providerTypeOverride?: string): MediaProvider {
    if (this.instance && !providerTypeOverride) return this.instance;

    let providerType = (providerTypeOverride || ProviderType.JELLYFIN) as ProviderType;
    if (!providerTypeOverride) {
        try {
            const config = getRuntimeConfig();
            providerType = config.provider;
        } catch (e) {
            // Fallback for build time etc
        }
    }

    const provider = this.createProvider(providerType);
    if (!providerTypeOverride) {
        this.instance = provider;
    }
    return provider;
  }

  private static createProvider(type: ProviderType): MediaProvider {
    switch (type) {
      case ProviderType.JELLYFIN:
        return new JellyfinProvider();
      case ProviderType.TMDB:
        return new TmdbProvider();
      case ProviderType.PLEX:
        return new PlexProvider();
      case ProviderType.EMBY:
        return new EmbyProvider();
      default:
        console.warn(`Unknown provider: ${type}, defaulting to Jellyfin`);
        return new JellyfinProvider();
    }
  }
}

// Export a function instead of a constant to avoid issues with getRuntimeConfig being called too early
export const getMediaProvider = (type?: string) => ProviderFactory.getProvider(type);
