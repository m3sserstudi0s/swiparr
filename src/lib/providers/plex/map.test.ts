import assert from "node:assert/strict";
import test from "node:test";

import { mapPlexItem } from "./map";

/**
 * Fixtures below are trimmed copies of real responses from a Plex 1.43 server
 * (Breaking Bad, 5 seasons / 62 episodes). Field names and value shapes are
 * what the server actually returns, so a schema or mapping change that breaks
 * on a live server breaks here first.
 */
const showFixture = {
  ratingKey: "1",
  key: "/library/metadata/1/children",
  guid: "plex://show/5d9c083402391c001f583d09",
  type: "show",
  title: "Breaking Bad",
  contentRating: "TV-MA",
  summary: "Walter White, a New Mexico chemistry teacher.",
  index: 1,
  audienceRating: 9.0,
  audienceRatingImage: "themoviedb://image.rating",
  year: 2008,
  tagline: "The end justifies the extreme.",
  thumb: "/library/metadata/1/thumb/1697600298",
  art: "/library/metadata/1/art/1697600298",
  duration: 2820000,
  leafCount: 62,
  viewedLeafCount: 0,
  childCount: 5,
  Genre: [{ tag: "Drama" }, { tag: "Crime" }],
};

const partiallyWatchedShowFixture = { ...showFixture, viewedLeafCount: 21 };

const seasonFixture = {
  ratingKey: "2",
  key: "/library/metadata/2/children",
  parentRatingKey: "1",
  guid: "plex://season/602e61de66dfdb002c096b16",
  type: "season",
  title: "Season 1",
  parentTitle: "Breaking Bad",
  index: 1,
  leafCount: 7,
  viewedLeafCount: 3,
};

const episodeFixture = {
  ratingKey: "3",
  key: "/library/metadata/3",
  parentRatingKey: "2",
  grandparentRatingKey: "1",
  guid: "plex://episode/5d9c0fc37b5c2e001e6a7045",
  type: "episode",
  title: "Pilot",
  grandparentTitle: "Breaking Bad",
  parentTitle: "Season 1",
  index: 1,
  parentIndex: 1,
  duration: 3480000,
  viewOffset: 120000,
};

const movieFixture = {
  ratingKey: "99",
  key: "/library/metadata/99",
  guid: "plex://movie/5d776b59ad5437001f7a8f22",
  type: "movie",
  title: "The Bear",
  year: 2022,
  duration: 1800000,
  audienceRating: 8.6,
};

test("a show maps with season and episode counts", () => {
  const item = mapPlexItem(showFixture);
  assert.equal(item.Kind, "series");
  assert.equal(item.Id, "1");
  assert.equal(item.Name, "Breaking Bad");
  assert.equal(item.SeasonCount, 5);
  assert.equal(item.EpisodeCount, 62);
  assert.equal(item.ProductionYear, 2008);
});

test("an unwatched show carries its whole episode count as unplayed", () => {
  const item = mapPlexItem(showFixture);
  assert.equal(item.Progress?.unplayedCount, 62);
  assert.equal(item.Progress?.played, false);
});

test("a partially watched show counts only what is left", () => {
  const item = mapPlexItem(partiallyWatchedShowFixture);
  assert.equal(item.Progress?.unplayedCount, 41);
  assert.equal(item.Progress?.played, false);
});

test("a fully watched show is flagged played", () => {
  const item = mapPlexItem({ ...showFixture, viewedLeafCount: 62 });
  assert.equal(item.Progress?.unplayedCount, 0);
  assert.equal(item.Progress?.played, true);
});

test("a season knows its show and its number", () => {
  const item = mapPlexItem(seasonFixture);
  assert.equal(item.Kind, "season");
  assert.equal(item.SeriesId, "1");
  assert.equal(item.SeriesName, "Breaking Bad");
  assert.equal(item.SeasonNumber, 1);
  assert.equal(item.EpisodeNumber, undefined);
});

test("an episode knows its season, number and resume position", () => {
  const item = mapPlexItem(episodeFixture);
  assert.equal(item.Kind, "episode");
  assert.equal(item.SeasonNumber, 1);
  assert.equal(item.EpisodeNumber, 1);
  assert.equal(item.SeriesName, "Breaking Bad");
  assert.equal(item.Progress?.positionTicks, 120000 * 10000);
});

test("a movie is unchanged apart from its Kind", () => {
  const item = mapPlexItem(movieFixture);
  assert.equal(item.Kind, "movie");
  assert.equal(item.Name, "The Bear");
  assert.equal(item.SeasonCount, undefined);
  assert.equal(item.EpisodeCount, undefined);
  assert.equal(item.SeriesId, undefined);
  assert.equal(item.Progress, undefined);
  // Plex reports duration in ms; MediaItem expects 100 ns ticks.
  assert.equal(item.RunTimeTicks, 1800000 * 10000);
});

test("a payload with no type is treated as a movie", () => {
  const { type, ...withoutType } = movieFixture;
  assert.equal(mapPlexItem(withoutType).Kind, "movie");
});
