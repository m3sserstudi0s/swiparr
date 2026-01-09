export const QUERY_KEYS = {
  session: ["session"] as const,
  members: (code: string) => ["session", code, "members"] as const,
  matches: (code: string) => ["session", code, "matches"] as const,
  stats: (code: string) => ["session", code, "stats"] as const,
  deck: (code: string | null) => ["deck", code] as const,
  likes: ["likes"] as const,
  jellyfin: {
    genres: ["jellyfin", "genres"] as const,
    years: ["jellyfin", "years"] as const,
    ratings: ["jellyfin", "ratings"] as const,
    libraries: ["jellyfin", "libraries"] as const,
  },
  admin: {
    status: ["admin", "status"] as const,
    config: ["admin", "config"] as const,
    libraries: ["admin", "libraries"] as const,
  }
};
