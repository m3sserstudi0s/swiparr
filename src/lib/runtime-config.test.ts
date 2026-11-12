import assert from "node:assert/strict";
import { test } from "node:test";
import { gainsStreamingSettings } from "./runtime-config";
import { ProviderType } from "./providers/types";

test("jellyfin gains streaming settings only with a TMDB token", () => {
  assert.equal(gainsStreamingSettings(ProviderType.JELLYFIN, true), true);
  assert.equal(gainsStreamingSettings(ProviderType.JELLYFIN, false), false);
});

test("a plain TMDB instance gets the same controls", () => {
  // Region and streaming providers are TMDB discover parameters for every
  // catalogue, so hiding them here was a UI limit, not a service one.
  assert.equal(gainsStreamingSettings(ProviderType.TMDB, true), true);
  assert.equal(gainsStreamingSettings(ProviderType.TMDB, false), false);
});

test("library providers without TMDB in the deck keep their own settings", () => {
  assert.equal(gainsStreamingSettings(ProviderType.EMBY, true), false);
  assert.equal(gainsStreamingSettings(ProviderType.PLEX, true), false);
});
