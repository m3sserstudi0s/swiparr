import assert from "node:assert/strict";
import test from "node:test";

import { interleaveByKind, splitPaging } from "./interleave";

test("a mixed page alternates types instead of exhausting the first one", () => {
  const movies = ["m1", "m2", "m3"];
  const series = ["s1", "s2", "s3"];
  assert.deepEqual(interleaveByKind([movies, series]), ["m1", "s1", "m2", "s2", "m3", "s3"]);
});

test("an uneven page keeps going once one list runs out", () => {
  assert.deepEqual(interleaveByKind([["m1", "m2", "m3"], ["s1"]]), ["m1", "s1", "m2", "m3"]);
});

test("the limit stops the merge at the page size", () => {
  const merged = interleaveByKind([["m1", "m2", "m3"], ["s1", "s2", "s3"]], 3);
  assert.deepEqual(merged, ["m1", "s1", "m2"]);
});

test("nothing in, nothing out", () => {
  assert.deepEqual(interleaveByKind([[], []]), []);
  assert.deepEqual(interleaveByKind([]), []);
});

test("paging is divided so consecutive pages neither overlap nor skip", () => {
  // page 0: first 10 of each type, page 1: the next 10 of each type
  assert.deepEqual(splitPaging(20, 0, 2), { limit: 10, offset: 0 });
  assert.deepEqual(splitPaging(20, 20, 2), { limit: 10, offset: 10 });
  assert.deepEqual(splitPaging(20, 40, 2), { limit: 10, offset: 20 });
  // an odd page size still spends the last card
  assert.deepEqual(splitPaging(21, 0, 2), { limit: 11, offset: 0 });
  // one type means the request is unchanged
  assert.deepEqual(splitPaging(20, 40, 1), { limit: 20, offset: 40 });
});
