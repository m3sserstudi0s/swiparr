import assert from "node:assert/strict";
import test from "node:test";

import {
  DECK_MODES,
  DEFAULT_DECK_MODE,
  deckModeOf,
  isDeckMode,
  kindsForDeckMode,
  withDeckDefaults,
} from "./deck-mode";
import type { Filters } from "@/types/session";

// A filter object as written by every release before 2.0: no deckMode, no kinds.
const LEGACY_FILTERS: Filters = { genres: ["Drama"], yearRange: [1990, 2020] };

test("a pre-2.0 filter object means the movies deck", () => {
  assert.equal(DEFAULT_DECK_MODE, "movies");
  assert.equal(deckModeOf(LEGACY_FILTERS), "movies");
  assert.equal(deckModeOf(null), "movies");
  assert.equal(deckModeOf(undefined), "movies");
});

test("an unrecognised stored mode falls back to movies instead of throwing", () => {
  assert.equal(deckModeOf({ deckMode: "podcasts" }), "movies");
  assert.equal(isDeckMode("shows"), true);
  assert.equal(isDeckMode("podcasts"), false);
});

test("every mode maps to the kinds it may show", () => {
  assert.deepEqual(kindsForDeckMode("movies"), ["movie"]);
  assert.deepEqual(kindsForDeckMode("shows"), ["series"]);
  assert.deepEqual(kindsForDeckMode("continue"), ["series"]);
  assert.deepEqual(kindsForDeckMode("episodes"), ["episode"]);
  assert.deepEqual(kindsForDeckMode("mixed"), ["movie", "series"]);
  assert.equal(DECK_MODES.length, 5);
});

test("withDeckDefaults leaves a legacy filter object otherwise intact", () => {
  const filled = withDeckDefaults(LEGACY_FILTERS);
  assert.deepEqual(filled, {
    genres: ["Drama"],
    yearRange: [1990, 2020],
    deckMode: "movies",
    kinds: ["movie"],
  });
});

test("withDeckDefaults keeps an explicit mode and derives kinds from it", () => {
  const filled = withDeckDefaults({ genres: [], deckMode: "shows", kinds: ["movie"] });
  assert.equal(filled?.deckMode, "shows");
  // kinds is derived, never trusted from the stored row
  assert.deepEqual(filled?.kinds, ["series"]);
});

test("no filters stays null rather than becoming an object", () => {
  // A user with no filters configured already gets the movies deck; turning null
  // into an object would change every path that branches on "has filters".
  assert.equal(withDeckDefaults(null), null);
  assert.equal(withDeckDefaults(undefined), null);
});
