import assert from "node:assert/strict";
import test from "node:test";

import { mapJellyfinItem } from "./map";

const movieFixture = {
  Id: "8d6b1f2a-0000-0000-0000-000000000000",
  Name: "The Bear",
  ProductionYear: 2022,
  CommunityRating: 8.6,
  Overview: "A chef returns home.",
  Genres: ["Drama"],
  ImageTags: { Primary: "primary-tag" },
  BackdropImageTags: ["backdrop-tag"],
  ProviderIds: { Tmdb: "136315" },
  UserData: { Played: false },
};

const seriesFixture = {
  Id: "9f1c2b3d4e5f60718293a4b5c6d7e8f9",
  Name: "Severance",
  Type: "Series",
  ProductionYear: 2022,
  CommunityRating: 8.7,
  Overview: "Work and life, severed.",
  Genres: ["Drama", "Mystery"],
  ChildCount: 2,
  RecursiveItemCount: 19,
  Status: "Continuing",
  ImageTags: { Primary: "series-primary" },
  ProviderIds: { Tmdb: "95396" },
  UserData: { Played: false, UnplayedItemCount: 7 },
};

const seasonFixture = {
  Id: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
  Name: "Season 1",
  Type: "Season",
  SeriesId: seriesFixture.Id,
  SeriesName: "Severance",
  IndexNumber: 1,
  ChildCount: 9,
  ProductionYear: 2022,
  UserData: { Played: false, UnplayedItemCount: 2 },
};

const episodeFixture = {
  Id: "b1b2c3d4e5f60718293a4b5c6d7e8f91",
  Name: "Good News About Hell",
  Type: "Episode",
  SeriesId: seriesFixture.Id,
  SeriesName: "Severance",
  ParentIndexNumber: 1,
  IndexNumber: 1,
  // 57 minutes: Jellyfin ticks are 100 ns, so 600,000,000 ticks per minute.
  RunTimeTicks: 34_200_000_000,
  Overview: "Mark gets a promotion.",
  ImageTags: { Primary: "episode-primary" },
  UserData: { Played: true, UnplayedItemCount: 0 },
};

test("maps a library item into a MediaItem without losing identity", () => {
  const item = mapJellyfinItem(movieFixture);

  assert.deepEqual(item, {
    Id: movieFixture.Id,
    // Absent Type on a library item still means movie.
    Kind: "movie",
    Name: "The Bear",
    OriginalTitle: undefined,
    Language: undefined,
    RunTimeTicks: undefined,
    ProductionYear: 2022,
    CommunityRating: 8.6,
    Overview: "A chef returns home.",
    Taglines: undefined,
    OfficialRating: undefined,
    Genres: ["Drama"],
    People: undefined,
    ImageTags: { Primary: "primary-tag" },
    BackdropImageTags: ["backdrop-tag"],
    ProviderIds: { Tmdb: "136315" },
    UserData: { IsFavorite: undefined, Likes: undefined, Played: false },
  });
});

test("prefers the preferred metadata language, then the default audio track", () => {
  assert.equal(
    mapJellyfinItem({ ...movieFixture, PreferredMetadataLanguage: "sv" }).Language,
    "sv",
  );

  assert.equal(
    mapJellyfinItem({
      ...movieFixture,
      MediaStreams: [
        { Type: "Audio", Language: "eng" },
        { Type: "Audio", Language: "swe", IsDefault: true },
      ],
    }).Language,
    "swe",
  );
});

// --- Shows: the same mapper, judged by Type ---

test("maps a series with its commitment numbers", () => {
  const item = mapJellyfinItem(seriesFixture);

  assert.equal(item.Kind, "series");
  assert.equal(item.SeasonCount, 2);
  assert.equal(item.EpisodeCount, 19);
  assert.equal(item.Status, "continuing");
  assert.deepEqual(item.Progress, { played: false, unplayedCount: 7, positionTicks: undefined });
  // Series must not pick up episode fields.
  assert.equal(item.SeasonNumber, undefined);
  assert.equal(item.EpisodeNumber, undefined);
});

test("maps a season to a season number and its episode count", () => {
  const item = mapJellyfinItem(seasonFixture);

  assert.equal(item.Kind, "season");
  assert.equal(item.SeriesId, seriesFixture.Id);
  assert.equal(item.SeasonNumber, 1);
  assert.equal(item.EpisodeCount, 9);
});

test("maps an episode with season/episode numbers and a runtime in minutes", () => {
  const item = mapJellyfinItem(episodeFixture);

  assert.equal(item.Kind, "episode");
  assert.equal(item.SeriesName, "Severance");
  assert.equal(item.SeasonNumber, 1);
  assert.equal(item.EpisodeNumber, 1);
  assert.equal(item.EpisodeRuntimeMinutes, 57);
  assert.equal(item.Progress?.played, true);
});

test("an item without Type is still a movie", () => {
  assert.equal(mapJellyfinItem({ Id: "x", Name: "No type" }).Kind, "movie");
});

test("Ended maps to a closed series with an end year", () => {
  const item = mapJellyfinItem({ ...seriesFixture, Status: "Ended", EndDate: "2024-04-12T00:00:00.0000000Z" });
  assert.equal(item.Status, "ended");
  assert.equal(item.EndYear, 2024);
});
