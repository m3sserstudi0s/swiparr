import assert from "node:assert/strict";
import test from "node:test";

import {
  mapTvDetails,
  mapTvEpisode,
  mapTvListItem,
  mapTvSeason,
  seasonNumbersFor,
  tmdbTvId,
  tvApiId,
  tvStatusOf,
} from "./tv";

/**
 * Fixtures are trimmed copies of real TMDB responses: `discover/tv` and
 * `tv/1396?append_to_response=credits,content_ratings` (Breaking Bad). The list
 * payload genuinely has no `status`, `number_of_seasons` or `number_of_episodes`
 * — that absence is part of the contract being tested, not an omission.
 */
const listItemFixture = {
  id: 57243,
  name: "Doctor Who",
  original_name: "Doctor Who",
  overview: "The Doctor travels in the TARDIS.",
  first_air_date: "2005-03-26",
  vote_average: 7.631,
  original_language: "en",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  genre_ids: [10759, 18, 10765],
  origin_country: ["GB"],
};

const detailsFixture = {
  id: 1396,
  name: "Breaking Bad",
  original_name: "Breaking Bad",
  overview: "Walter White, a New Mexico chemistry teacher.",
  status: "Ended",
  first_air_date: "2008-01-20",
  last_air_date: "2013-09-29",
  vote_average: 8.959,
  original_language: "en",
  poster_path: "/bb.jpg",
  backdrop_path: "/bb-bd.jpg",
  episode_run_time: [],
  genres: [{ id: 18, name: "Drama" }, { id: 80, name: "Crime" }],
  number_of_seasons: 5,
  number_of_episodes: 62,
  seasons: [
    { season_number: 0, name: "Specials", episode_count: 9 },
    { season_number: 1, name: "Season 1", episode_count: 7, air_date: "2008-01-20", poster_path: "/s1.jpg" },
    { season_number: 2, name: "Season 2", episode_count: 13, air_date: "2009-03-08" },
  ],
  credits: {
    cast: [{ id: 17419, name: "Bryan Cranston", character: "Walter White", profile_path: "/bc.jpg" }],
    crew: [
      { id: 66633, name: "Vince Gilligan", job: "Creator", profile_path: null },
      { id: 99999, name: "Michelle MacLaren", job: "Director", profile_path: null },
    ],
  },
};

const genreMap = new Map([
  ["10759", "Action & Adventure"],
  ["18", "Drama"],
  ["10765", "Sci-Fi & Fantasy"],
]);

test("a series id always carries the tv prefix, because TMDB id spaces collide", () => {
  assert.equal(tmdbTvId(1396), "tmdb:tv:1396");
  assert.equal(tvApiId("tmdb:tv:1396"), "1396");
  assert.equal(tvApiId("1396"), "1396");
});

test("TMDB's status vocabulary maps onto the deck's three states", () => {
  assert.equal(tvStatusOf("Returning Series"), "continuing");
  assert.equal(tvStatusOf("In Production"), "continuing");
  assert.equal(tvStatusOf("Ended"), "ended");
  assert.equal(tvStatusOf("Canceled"), "ended");
  assert.equal(tvStatusOf("Planned"), "continuing");
  assert.equal(tvStatusOf(undefined), undefined);
  assert.equal(tvStatusOf("Something New"), undefined);
});

test("a list item maps as a series with year, genres and no invented counts", () => {
  const item = mapTvListItem(listItemFixture, genreMap);
  assert.equal(item.Kind, "series");
  assert.equal(item.Id, "tmdb:tv:57243");
  assert.equal(item.Name, "Doctor Who");
  assert.equal(item.ProductionYear, 2005);
  assert.deepEqual(item.Genres, ["Action & Adventure", "Drama", "Sci-Fi & Fantasy"]);
  // The list payload simply does not carry these; a card must not show them.
  assert.equal(item.SeasonCount, undefined);
  assert.equal(item.EpisodeCount, undefined);
  assert.equal(item.Status, undefined);
  assert.equal(item.Progress, undefined);
});

test("a series detail carries counts, status and the end year", () => {
  const item = mapTvDetails(detailsFixture);
  assert.equal(item.Kind, "series");
  assert.equal(item.SeasonCount, 5);
  assert.equal(item.EpisodeCount, 62);
  assert.equal(item.Status, "ended");
  assert.equal(item.ProductionYear, 2008);
  assert.equal(item.EndYear, 2013);
  assert.deepEqual(item.Genres, ["Drama", "Crime"]);
  // An empty episode_run_time array must not become a bogus runtime.
  assert.equal(item.EpisodeRuntimeMinutes, undefined);
});

test("creators are credited as well as directors", () => {
  const item = mapTvDetails(detailsFixture);
  const roles = item.People?.map((p) => `${p.Name}:${p.Role}`);
  assert.ok(roles?.includes("Bryan Cranston:Walter White"));
  assert.ok(roles?.includes("Vince Gilligan:Creator"));
  assert.ok(roles?.includes("Michelle MacLaren:Director"));
});

test("a season knows its show and number", () => {
  const season = mapTvSeason(detailsFixture.seasons[1], { id: 1396, name: "Breaking Bad" });
  assert.equal(season.Kind, "season");
  assert.equal(season.SeasonNumber, 1);
  assert.equal(season.Name, "Season 1");
  assert.equal(season.SeriesId, "tmdb:tv:1396");
  assert.equal(season.SeriesName, "Breaking Bad");
  assert.equal(season.EpisodeCount, 7);
  assert.equal(season.ProductionYear, 2008);
});

test("an episode knows its season, number and runtime", () => {
  const episode = mapTvEpisode(
    { episode_number: 1, name: "Pilot", overview: "…", runtime: 58, vote_average: 8.2, still_path: "/still.jpg" },
    { id: 1396, name: "Breaking Bad" },
    1
  );
  assert.equal(episode.Kind, "episode");
  assert.equal(episode.SeasonNumber, 1);
  assert.equal(episode.EpisodeNumber, 1);
  assert.equal(episode.SeriesName, "Breaking Bad");
  // 58 minutes in 100 ns ticks.
  assert.equal(episode.RunTimeTicks, 58 * 60 * 10_000_000);
});

test("season numbers come from the show payload, specials excluded and sorted", () => {
  // TMDB lists season 0 for specials and does not promise ordering.
  const show = {
    seasons: [
      { season_number: 2 },
      { season_number: 0 },
      { season_number: 1 },
      { season_number: 2 },
      { season_number: null },
    ],
  };
  assert.deepEqual(seasonNumbersFor(show), [1, 2]);
  // A show with no season list fans out to nothing rather than guessing season 1.
  assert.deepEqual(seasonNumbersFor({}), []);
});
