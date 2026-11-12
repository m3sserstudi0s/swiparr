import assert from "node:assert/strict";
import test from "node:test";

import type { MediaItem } from "@/types/media";
import {
  canServeContinuation,
  excludeSwiped,
  seriesIdsFromNextUp,
  slicePage,
  unwatchedEpisodes,
} from "./continue-deck";

const episode = (id: string, extra: Partial<MediaItem> = {}): MediaItem => ({
  Id: id,
  Name: `Episode ${id}`,
  ...extra,
});

const nextUp = [
  episode("e1", { SeriesId: "s1", SeriesName: "Breaking Bad" }),
  episode("e2", { SeriesId: "s2", SeriesName: "Better Call Saul" }),
  episode("e3", { SeriesId: "s1", SeriesName: "Breaking Bad" }),
];

test("a provider without next-up cannot serve a continuation deck", () => {
  assert.equal(canServeContinuation("continue", { hasNextUp: false, hasProgress: true }), false);
  assert.equal(canServeContinuation("episodes", { hasNextUp: false, hasProgress: true }), false);
});

test("continue needs watched state; episodes only needs the shelf", () => {
  assert.equal(canServeContinuation("continue", { hasNextUp: true, hasProgress: true }), true);
  assert.equal(canServeContinuation("continue", { hasNextUp: true, hasProgress: false }), false);
  assert.equal(canServeContinuation("episodes", { hasNextUp: true, hasProgress: false }), true);
});

test("swiped items never come back in a continuation deck", () => {
  const visible = excludeSwiped(nextUp, new Set(["e2"]));
  assert.deepEqual(visible.map((i) => i.Id), ["e1", "e3"]);
});

test("each show contributes its id once, in first-seen order, bounded", () => {
  assert.deepEqual(seriesIdsFromNextUp(nextUp), ["s1", "s2"]);
  assert.equal(seriesIdsFromNextUp(nextUp, 1).length, 1);
  assert.deepEqual(seriesIdsFromNextUp([episode("x")]), []);
});

test("watched and swiped episodes are dropped, not just the played flag", () => {
  const episodes = [
    episode("a"),
    episode("b", { UserData: { IsFavorite: false, Likes: false, Played: true } }),
    episode("c", { Progress: { played: true } }),
    episode("d"),
  ];
  const kept = unwatchedEpisodes(episodes, new Set(["d"]));
  assert.deepEqual(kept.map((e) => e.Id), ["a"]);
});

test("paging reports hasMore only when something is actually left", () => {
  const items = [1, 2, 3, 4, 5];
  assert.deepEqual(slicePage(items, 0, 2), { items: [1, 2], hasMore: true });
  assert.deepEqual(slicePage(items, 2, 2), { items: [5], hasMore: false });
  assert.deepEqual(slicePage([], 0, 20), { items: [], hasMore: false });
});
