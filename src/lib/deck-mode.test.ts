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

test("a filter object with no mode at all is the movies deck on a films-only provider", () => {
  const stored = withDeckDefaults({ genres: [] });
  assert.equal(stored?.deckMode, "movies");
  assert.deepEqual(stored?.kinds, ["movie"]);
});

test("a filter object that predates shows means every kind when the provider has shows", () => {
  // Sessions saved before 2.0 carry no kinds and no mode. They were films-only because
  // films were all the app could show, not because anyone asked for that.
  const stored = withDeckDefaults({ genres: [], unplayedOnly: true }, true);
  assert.equal(stored?.deckMode, "mixed");
  assert.deepEqual(stored?.kinds, ["movie", "series"]);
});

test("an explicit movies choice stays films-only even on a provider with shows", () => {
  const stored = withDeckDefaults({ genres: [], deckMode: "movies" }, true);
  assert.equal(stored?.deckMode, "movies");
  assert.deepEqual(stored?.kinds, ["movie"]);
});

test("the 1.x drawer's films-only fallback is not a choice", () => {
  // `kinds: ["movie"]` with no `deckMode` is what the old drawer wrote when nothing was selected.
  // It lives in the session cookie, so it outlives the release that stopped writing it.
  const stored = withDeckDefaults({ genres: [], kinds: ["movie"], unplayedOnly: true }, true);
  assert.equal(stored?.deckMode, "mixed");
  assert.deepEqual(stored?.kinds, ["movie", "series"]);
});

test("the same films-only object on a provider without shows stays films", () => {
  const stored = withDeckDefaults({ genres: [], kinds: ["movie"] }, false);
  assert.equal(stored?.deckMode, "movies");
  assert.deepEqual(stored?.kinds, ["movie"]);
});

test("choosing only shows keeps the shows deck", () => {
  const stored = withDeckDefaults({ genres: [], kinds: ["series"], deckMode: "shows" }, true);
  assert.equal(stored?.deckMode, "shows");
  assert.deepEqual(stored?.kinds, ["series"]);
});
