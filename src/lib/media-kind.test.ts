import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_MEDIA_KIND, isMediaKind, itemKind, resolveSwipeKind } from "./media-kind";

test("an item without a Kind is a movie", () => {
  assert.equal(DEFAULT_MEDIA_KIND, "movie");
  assert.equal(itemKind(undefined), "movie");
  assert.equal(itemKind(null), "movie");
  assert.equal(itemKind({}), "movie");
});

test("an explicit Kind wins", () => {
  assert.equal(itemKind({ Kind: "series" }), "series");
  assert.equal(itemKind({ Kind: "episode" }), "episode");
});

test("an invalid Kind is not trusted", () => {
  assert.equal(isMediaKind("season"), true);
  assert.equal(isMediaKind("show"), false);
  assert.equal(isMediaKind(undefined), false);
  assert.equal(itemKind({ Kind: "show" as any }), "movie");
});

test("swipe kind comes from the payload first", () => {
  assert.equal(resolveSwipeKind({ Kind: "series" }, "abc"), "series");
});

test("swipe kind falls back to the typed id, then to movie", () => {
  assert.equal(resolveSwipeKind(undefined, "tmdb:tv:1399"), "series");
  assert.equal(resolveSwipeKind(undefined, "tmdb:movie:550"), "movie");
  assert.equal(resolveSwipeKind({}, "8d6b1f2a-0000-0000-0000-000000000000"), "movie");
});

test("a client payload with a junk Kind does not poison the row", () => {
  assert.equal(resolveSwipeKind({ Kind: "banana" }, "tmdb:tv:1399"), "series");
});
