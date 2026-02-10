export const QUERY_KEYS = {
  session: ["session"] as const,
  members: (code: string) => ["session", code, "members"] as const,
  matches: (code: string) => ["session", code, "matches"] as const,
  stats: (code: string) => ["session", code, "stats"] as const,
  deck: (code: string | null) => ["deck", code] as const,
  likes: ["likes"] as const,
  media: {
    genres: ["media", "genres"] as const,
    years: ["media", "years"] as const,
    ratings: (region: string) => ["media", "ratings", region] as const,
    libraries: ["media", "libraries"] as const,
    watchProviders: (region: string, sessionCode?: string | null) => ["media", "watchProviders", region, sessionCode] as const,
    regions: ["media", "regions"] as const,
    themes: ["media", "themes"] as const,
  },
  user: {
    settings: ["user", "settings"] as const,
  },
  movie: (id: string | null, sessionCode?: string | null) => ["movie", id, sessionCode] as const,
  admin: {

    status: ["admin", "status"] as const,
    config: ["admin", "config"] as const,
    libraries: ["admin", "libraries"] as const,
  }
};
