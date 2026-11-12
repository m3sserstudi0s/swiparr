import assert from "node:assert/strict";
import test from "node:test";

import { kindFromJellyfinType, toIncludeItemTypes } from "./params";

test("an unset or empty kinds list asks for movies, not everything", () => {
  assert.equal(toIncludeItemTypes(), "Movie");
  assert.equal(toIncludeItemTypes([]), "Movie");
});

test("each deck mode asks Jellyfin for the matching item type", () => {
  assert.equal(toIncludeItemTypes(["movie"]), "Movie");
  assert.equal(toIncludeItemTypes(["series"]), "Series");
  assert.equal(toIncludeItemTypes(["episode"]), "Episode");
  assert.equal(toIncludeItemTypes(["movie", "series"]), "Movie,Series");
});

test("seasons are never a deck unit, so they never appear in the item types", () => {
  assert.equal(toIncludeItemTypes(["season"]), "Movie");
  assert.equal(toIncludeItemTypes(["season", "series"]), "Series");
});

test("duplicated kinds collapse into one type", () => {
  assert.equal(toIncludeItemTypes(["series", "series"]), "Series");
});

test("Jellyfin type names map onto media kinds case-insensitively", () => {
  assert.equal(kindFromJellyfinType("Movie"), "movie");
  assert.equal(kindFromJellyfinType("series"), "series");
  assert.equal(kindFromJellyfinType("Season"), "season");
  assert.equal(kindFromJellyfinType("Episode"), "episode");
  assert.equal(kindFromJellyfinType("BoxSet"), undefined);
  assert.equal(kindFromJellyfinType(undefined), undefined);
});
