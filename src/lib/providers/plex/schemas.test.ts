import assert from "node:assert/strict";
import test from "node:test";

import { PlexContainerSchema } from "../schemas";

/**
 * `/library/metadata/{id}/children` returns real children in `Metadata` and
 * shortcut nodes in `Directory` — "All episodes" (key `/allLeaves`) has a title
 * and a leafCount but no `ratingKey`. The container must accept that shape so the
 * provider can drop the keyless node instead of throwing on a live server.
 */
test("a children container may hold keyless shortcut nodes alongside real items", () => {
  const payload = {
    MediaContainer: {
      size: 6,
      Metadata: [
        { ratingKey: "2", key: "/library/metadata/2/children", type: "season", title: "Season 1", index: 1, leafCount: 7, viewedLeafCount: 3 },
      ],
      Directory: [
        { key: "/library/metadata/1/allLeaves", type: "season", title: "All episodes", leafCount: 62, viewedLeafCount: 0 },
      ],
    },
  };

  const parsed = PlexContainerSchema.parse(payload);
  const children = [
    ...(parsed.MediaContainer.Metadata || []),
    ...(parsed.MediaContainer.Directory || []),
    ...(parsed.MediaContainer.Video || []),
  ].filter((child) => Boolean(child.ratingKey));

  assert.equal(children.length, 1);
  assert.equal(children[0].ratingKey, "2");
  assert.equal(children[0].title, "Season 1");
});

test("series fields survive parsing so the mapper can read them", () => {
  const parsed = PlexContainerSchema.parse({
    MediaContainer: {
      size: 1,
      Metadata: [{
        ratingKey: "1",
        key: "/library/metadata/1/children",
        type: "show",
        title: "Breaking Bad",
        leafCount: 62,
        viewedLeafCount: 21,
        childCount: 5,
      }],
    },
  });

  const show = parsed.MediaContainer.Metadata![0];
  assert.equal(show.leafCount, 62);
  assert.equal(show.viewedLeafCount, 21);
  assert.equal(show.childCount, 5);
});
