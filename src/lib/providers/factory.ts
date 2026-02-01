import { getRuntimeConfig } from "@/lib/runtime-config";
import { MediaProvider } from "./types";
import { JellyfinProvider } from "./jellyfin/index";
import { TmdbProvider } from "./tmdb/index";
import { PlexProvider } from "./plex/index";

class ProviderFactory {
  private static instance: MediaProvider;

  static getProvider(): MediaProvider {
    if (this.instance) return this.instance;

    // Use a try-catch because getRuntimeConfig might fail if called in a weird context
    // or just use a default if it's undefined
    let providerType = "jellyfin";
    try {
        const config = getRuntimeConfig();
        providerType = config.provider;
    } catch (e) {
        // Fallback for build time etc
    }

    switch (providerType) {
      case "jellyfin":
        this.instance = new JellyfinProvider();
        break;
      case "tmdb":
        this.instance = new TmdbProvider();
        break;
      case "plex":
        this.instance = new PlexProvider();
        break;
      default:
        console.warn(`Unknown provider: ${providerType}, defaulting to Jellyfin`);
        this.instance = new JellyfinProvider();
    }

    return this.instance;
  }
}

// Export a function instead of a constant to avoid issues with getRuntimeConfig being called too early
export const getMediaProvider = () => ProviderFactory.getProvider();
