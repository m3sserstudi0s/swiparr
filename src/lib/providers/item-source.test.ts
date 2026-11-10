import assert from "node:assert/strict";
import test from "node:test";

import { TMDB_ID_PREFIX } from "@/lib/constants";
import { ProviderType } from "./types";
import { isTmdbSourcedId, resolveItemSource, toHybridStreamingId } from "./item-source";

test("round-trips a streaming movie id", () => {
  const id = toHybridStreamingId("550");
  assert.equal(id, "tmdb:movie:550");
  assert.equal(TMDB_ID_PREFIX, "tmdb:movie:");
  assert.equal(isTmdbSourcedId(id), true);
  assert.deepEqual(resolveItemSource(id, ProviderType.JELLYFIN), {
    providerType: ProviderType.TMDB,
    externalId: "550",
  });
});

test("leaves a library id untouched", () => {
  const id = "8d6b1f2a-0000-0000-0000-000000000000";
  assert.equal(isTmdbSourcedId(id), false);
  assert.deepEqual(resolveItemSource(id, ProviderType.JELLYFIN), {
    providerType: ProviderType.JELLYFIN,
    externalId: id,
  });
});

test("does not treat the old untyped tmdb prefix as a streaming id", () => {
  assert.equal(isTmdbSourcedId("tmdb:550"), false);
});
