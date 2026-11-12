import assert from "node:assert/strict";
import test from "node:test";

import { TMDB_ID_PREFIX, TMDB_MOVIE_ID_PREFIX, TMDB_TV_ID_PREFIX } from "@/lib/constants";
import { ProviderType } from "./types";
import {
  isTmdbSourcedId,
  kindFromId,
  resolveItemSource,
  stripTypedPrefix,
  toHybridStreamingId,
  toStreamingId,
} from "./item-source";

test("round-trips a streaming movie id", () => {
  const id = toHybridStreamingId("550");
  assert.equal(id, "tmdb:movie:550");
  assert.equal(TMDB_ID_PREFIX, "tmdb:movie:");
  assert.equal(isTmdbSourcedId(id), true);
  assert.deepEqual(resolveItemSource(id, ProviderType.JELLYFIN), {
    providerType: ProviderType.TMDB,
    externalId: "550",
    kind: "movie",
  });
});

test("round-trips a streaming series id", () => {
  const id = toStreamingId("series", "1399");
  assert.equal(id, "tmdb:tv:1399");
  assert.equal(isTmdbSourcedId(id), true);
  assert.deepEqual(resolveItemSource(id, ProviderType.JELLYFIN), {
    providerType: ProviderType.TMDB,
    externalId: "1399",
    kind: "series",
  });
});

test("leaves a library id untouched and reports no kind", () => {
  const id = "8d6b1f2a-0000-0000-0000-000000000000";
  assert.equal(isTmdbSourcedId(id), false);
  assert.equal(kindFromId(id), undefined);
  assert.deepEqual(resolveItemSource(id, ProviderType.JELLYFIN), {
    providerType: ProviderType.JELLYFIN,
    externalId: id,
  });
});

test("does not treat the old untyped tmdb prefix as a streaming id", () => {
  assert.equal(isTmdbSourcedId("tmdb:550"), false);
  assert.equal(kindFromId("tmdb:550"), undefined);
});

test("kindFromId distinguishes movie from series at the same TMDB number", () => {
  // The whole point of typed prefixes: 550 is a movie, and a series with the
  // same TMDB number must not collide with it.
  assert.equal(kindFromId("tmdb:movie:550"), "movie");
  assert.equal(kindFromId("tmdb:tv:550"), "series");
  assert.notEqual(toStreamingId("movie", "550"), toStreamingId("series", "550"));
  assert.equal(stripTypedPrefix("tmdb:movie:550"), "550");
  assert.equal(stripTypedPrefix("tmdb:tv:550"), "550");
});

test("season and episode ids fall back to the movie prefix rather than inventing one", () => {
  // TMDB streams whole series, not single seasons; nothing should write
  // `tmdb:season:` and silently become unresolvable.
  assert.equal(toStreamingId("season", "1399"), "tmdb:movie:1399");
  assert.equal(toStreamingId("episode", "1399"), "tmdb:movie:1399");
});

test("the two prefixes are distinct and stable", () => {
  assert.equal(TMDB_MOVIE_ID_PREFIX, "tmdb:movie:");
  assert.equal(TMDB_TV_ID_PREFIX, "tmdb:tv:");
});
