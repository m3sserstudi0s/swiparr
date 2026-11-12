import assert from "node:assert/strict";
import test from "node:test";

import { matchesStartedFilter, seriesWatchState } from "./series-state";

const series = (episodeCount?: number, unplayedCount?: number) => ({
  Kind: "series" as const,
  EpisodeCount: episodeCount,
  Progress: unplayedCount === undefined ? undefined : { played: false, unplayedCount },
});

test("a series with every episode unplayed has not been started", () => {
  assert.equal(seriesWatchState(series(10, 10)), "notStarted");
});

test("a series with some episodes played is in progress", () => {
  assert.equal(seriesWatchState(series(10, 4)), "inProgress");
  assert.equal(seriesWatchState(series(10, 9)), "inProgress");
});

test("a series with nothing left to play is finished", () => {
  assert.equal(seriesWatchState(series(10, 0)), "finished");
});

test("missing progress data is unknown, never notStarted", () => {
  // Guessing "not started" would put a half-watched show back at S1E1.
  assert.equal(seriesWatchState(series(10, undefined)), "unknown");
  assert.equal(seriesWatchState(series(undefined, 3)), "unknown");
  assert.equal(seriesWatchState(series(0, 0)), "unknown");
});

test("the started filter passes movies and unknown series", () => {
  assert.equal(matchesStartedFilter({ Kind: "movie" }, "notStarted"), true);
  assert.equal(matchesStartedFilter({ Kind: "series", EpisodeCount: 5 }, "inProgress"), true);
});

test("the started filter separates notStarted from inProgress", () => {
  assert.equal(matchesStartedFilter(series(10, 10), "notStarted"), true);
  assert.equal(matchesStartedFilter(series(10, 10), "inProgress"), false);
  assert.equal(matchesStartedFilter(series(10, 3), "notStarted"), false);
  assert.equal(matchesStartedFilter(series(10, 3), "inProgress"), true);
});

test("any always passes", () => {
  assert.equal(matchesStartedFilter(series(10, 0), "any"), true);
});
