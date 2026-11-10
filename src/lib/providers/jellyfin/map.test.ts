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

test("maps a library item into a MediaItem without losing identity", () => {
  const item = mapJellyfinItem(movieFixture);

  assert.deepEqual(item, {
    Id: movieFixture.Id,
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
