import assert from "node:assert/strict";
import test from "node:test";

import { kindFromPlexType, plexSectionTypeForKind, plexTypeOf } from "./params";

test("every kind maps to Plex's numeric type id", () => {
  assert.equal(plexTypeOf("movie"), 1);
  assert.equal(plexTypeOf("series"), 2);
  assert.equal(plexTypeOf("season"), 3);
  assert.equal(plexTypeOf("episode"), 4);
});

test("numeric and string type representations both resolve", () => {
  assert.equal(kindFromPlexType(2), "series");
  assert.equal(kindFromPlexType("2"), "series");
  // XML-derived payloads carry the word, JSON carries the number.
  assert.equal(kindFromPlexType("show"), "series");
  assert.equal(kindFromPlexType("episode"), "episode");
  assert.equal(kindFromPlexType("movie"), "movie");
});

test("an unknown or missing type is undefined, never a guess", () => {
  assert.equal(kindFromPlexType(undefined), undefined);
  assert.equal(kindFromPlexType(9), undefined);
  assert.equal(kindFromPlexType("clip"), undefined);
});

test("a show and all of its descendants live in a `show` section", () => {
  assert.equal(plexSectionTypeForKind("movie"), "movie");
  assert.equal(plexSectionTypeForKind("series"), "show");
  assert.equal(plexSectionTypeForKind("season"), "show");
  assert.equal(plexSectionTypeForKind("episode"), "show");
});
