import assert from "node:assert/strict";
import test from "node:test";

import { deriveDeckMode, withDeckDefaults } from "./deck-mode";

test("movies alone is the movies deck", () => {
  assert.equal(deriveDeckMode({ kinds: ["movie"] }), "movies");
});

test("shows alone, whole series, is the shows deck", () => {
  assert.equal(deriveDeckMode({ kinds: ["series"], showUnit: "series" }), "shows");
  assert.equal(deriveDeckMode({ kinds: ["series"] }), "shows");
});

test("shows alone as single episodes is the episodes deck", () => {
  assert.equal(deriveDeckMode({ kinds: ["series"], showUnit: "episode" }), "episodes");
});

test("single episodes narrowed to what you are watching is the continuation deck", () => {
  assert.equal(
    deriveDeckMode({ kinds: ["series"], showUnit: "episode", started: "inProgress" }),
    "continue"
  );
});

test("both kinds is a mixed deck — there is no Mixed button, it is the combination", () => {
  assert.equal(deriveDeckMode({ kinds: ["movie", "series"] }), "mixed");
  assert.equal(deriveDeckMode({ kinds: ["movie", "series"], showUnit: "episode" }), "mixed");
});

test("no kinds at all falls back to movies", () => {
  assert.equal(deriveDeckMode({}), "movies");
  assert.equal(deriveDeckMode(null), "movies");
});

test("a 2.x filter object keeps its own kinds and derives the mode", () => {
  const stored = withDeckDefaults({
    genres: [],
    kinds: ["series"],
    showUnit: "episode",
    started: "inProgress",
  });
  assert.equal(stored?.deckMode, "continue");
  assert.deepEqual(stored?.kinds, ["series"]);
});

test("a pre-2.0 filter object keeps its stored mode and gains matching kinds", () => {
  const stored = withDeckDefaults({ genres: [], deckMode: "shows" });
  assert.equal(stored?.deckMode, "shows");
  assert.deepEqual(stored?.kinds, ["series"]);
});

test("a filter object with no mode at all is the movies deck", () => {
  const stored = withDeckDefaults({ genres: [] });
  assert.equal(stored?.deckMode, "movies");
  assert.deepEqual(stored?.kinds, ["movie"]);
});
