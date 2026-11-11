import { MediaKind } from "@/types/media";
import { DeckMode, Filters } from "@/types/session";

/**
 * Deck modes (2.0). A session has exactly one active mode; `mixed` is opt-in and
 * chips each card with its kind. Continue and episode are never mixed into the
 * default deck — they answer a different question than "what should we watch".
 *
 * Filters are stored as JSON on the session with no schema version. Rows written
 * before 2.0 have no `deckMode`, so reading one must yield `movies` — that is
 * what `deckModeOf()` and `withDeckDefaults()` are for.
 */

export const DECK_MODES: readonly DeckMode[] = [
  "movies",
  "shows",
  "continue",
  "episodes",
  "mixed",
];

export const DEFAULT_DECK_MODE: DeckMode = "movies";

/** Deck unit per mode. `kinds` is derived, never stored independently. */
export const DECK_MODE_KINDS: Record<DeckMode, MediaKind[]> = {
  movies: ["movie"],
  shows: ["series"],
  continue: ["series"],
  episodes: ["episode"],
  mixed: ["movie", "series"],
};

export function isDeckMode(value: unknown): value is DeckMode {
  return typeof value === "string" && (DECK_MODES as readonly string[]).includes(value);
}

/** Effective mode for a stored filter object; anything unrecognised is movies. */
export function deckModeOf(filters?: { deckMode?: unknown } | null): DeckMode {
  const mode = filters?.deckMode;
  return isDeckMode(mode) ? mode : DEFAULT_DECK_MODE;
}

export function kindsForDeckMode(mode: DeckMode): MediaKind[] {
  return [...DECK_MODE_KINDS[mode]];
}

/**
 * Fills `deckMode`/`kinds` on a stored filter object. Null stays null: a user
 * with no filters configured already gets the movies deck, and turning null into
 * an object would change paths that branch on "has filters".
 */
export function withDeckDefaults(filters: Filters | null | undefined): Filters | null {
  if (!filters) return null;
  const deckMode = deckModeOf(filters);
  return { ...filters, deckMode, kinds: kindsForDeckMode(deckMode) };
}
