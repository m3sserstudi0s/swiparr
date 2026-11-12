import assert from "node:assert/strict";
import test from "node:test";

import { collectionTypeLabel, isBrowseableCollectionType } from "./collection-types";

test("movie and show sections are browseable, in the app's vocabulary", () => {
  assert.equal(isBrowseableCollectionType("movies"), true);
  assert.equal(isBrowseableCollectionType("tvshows"), true);
});

test("other section types are not offered as swipe decks", () => {
  assert.equal(isBrowseableCollectionType("music"), false);
  assert.equal(isBrowseableCollectionType("homevideos"), false);
  assert.equal(isBrowseableCollectionType("photos"), false);
  // Plex's raw words are translated by its adapter, never stored as-is.
  assert.equal(isBrowseableCollectionType("movie"), false);
  assert.equal(isBrowseableCollectionType("show"), false);
  assert.equal(isBrowseableCollectionType(undefined), false);
  assert.equal(isBrowseableCollectionType(null), false);
});

test("labels are readable, not raw provider words", () => {
  assert.equal(collectionTypeLabel("movies"), "Movies");
  assert.equal(collectionTypeLabel("tvshows"), "Shows");
  assert.equal(collectionTypeLabel("music"), "music");
});
