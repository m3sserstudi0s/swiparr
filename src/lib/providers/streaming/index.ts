import { TmdbProvider } from "../tmdb/index";
import { SearchFilters, AuthContext } from "../types";
import { MediaItem } from "@/types/media";

/**
 * StreamingProvider
 * Thin wrapper over TmdbProvider that frames content discovery around
 * "which streaming services do you subscribe to?" rather than browsing
 * the general TMDB catalog. Defaults mediaType to "both" so movies and
 * TV shows appear together in the deck.
 */
export class StreamingProvider extends TmdbProvider {
  readonly name = "streaming";

  async getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]> {
    return super.getItems(
      { mediaType: "both", ...filters },
      auth
    );
  }
}
