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
