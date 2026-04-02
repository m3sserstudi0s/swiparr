export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: "fix" | "feature" | "improvement";
    description: string;
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.3.7",
    date: "2026-04-01",
    changes: [
      { type: "fix", description: "Content type filter (Movies / TV Shows) now correctly filters the swipe deck" },
    ],
  },
  {
    version: "1.3.6",
    date: "2026-03-28",
    changes: [
      { type: "feature", description: "Session hosts can now kick individual members from the Party section in the session sheet" },
      { type: "improvement", description: "Kick confirmation dialog with a persistent 'don't ask again' option" },
    ],
  },
  {
    version: "1.3.5",
    date: "2026-03-13",
    changes: [
      { type: "feature", description: "Request matched movies and shows directly via Seerr — click the download icon on any match to send it for admin approval" },
    ],
  },
  {
    version: "1.3.4",
    date: "2026-03-02",
    changes: [
      { type: "fix", description: "Fixed 'no items loaded' bug that could prevent the swipe deck from populating" },
      { type: "fix", description: "Fixed Plex authentication bug" },
      { type: "fix", description: "Fixed Plex IP address and URL matching for multi-server setups" },
      { type: "fix", description: "Fixed slow filter loading on initial render" },
      { type: "fix", description: "Fixed custom URL base path support for reverse proxy deployments" },
      { type: "feature", description: "Animated heart background now appears behind match celebration" },
      { type: "feature", description: "Proper real-time event handling via new SSE event service" },
      { type: "improvement", description: "Security hardening across Plex auth, URL validation, and crypto utilities" },
      { type: "improvement", description: "UUID generation now works in non-HTTPS (insecure) contexts as a fallback" },
    ],
  },
  {
    version: "1.2.12",
    date: "2026-02-26",
    changes: [
      { type: "feature", description: "Confetti burst animation now plays when a match is found" },
      { type: "improvement", description: "Maturity ratings now default to US certifications (G, PG, PG-13, R, NC-17)" },
      { type: "feature", description: "New TMDB_LANGUAGES env var restricts content to specific original languages (e.g. English only)" },
      { type: "feature", description: "New EXCLUDED_LANGUAGES env var blocks content by original language as a secondary filter" },
      { type: "improvement", description: "Login sessions now persist for 1 year — no more being logged out when closing the browser" },
    ],
  },
  {
    version: "1.0.34",
    date: "2026-02-23",
    changes: [
      { type: "fix", description: "Region and streaming service preferences now persist correctly across sessions" },
      { type: "fix", description: "Streaming services no longer show empty after selecting a region" },
      { type: "fix", description: "Swipe deck now loads content when streaming services are selected" },
      { type: "fix", description: "Filter preferences (genres, year, runtime, etc.) now save and restore between sessions" },
      { type: "fix", description: "Year range and runtime filters now correctly affect results" },
      { type: "fix", description: "\"Movies & TV\" mode now shows both movies and TV shows interleaved in the deck" },
      { type: "improvement", description: "The swipe deck now automatically loads more content as you near the end — you should never run out of cards" },
    ],
  },
];
