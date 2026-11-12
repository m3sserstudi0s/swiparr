import assert from "node:assert/strict";
import test from "node:test";

import { resolveStartHere, type EpisodeRef, type MemberPosition } from "./start-here";

const episodes: EpisodeRef[] = [
  { season: 1, episode: 1 },
  { season: 1, episode: 2 },
  { season: 2, episode: 1 },
  { season: 2, episode: 2 },
];

const member = (name: string, nextUnwatchedIndex: number, isHost = false): MemberPosition => ({
  userId: name.toLowerCase(),
  name,
  isHost,
  nextUnwatchedIndex,
});

test("a show nobody started starts at S1E1", () => {
  const result = resolveStartHere({ episodes, members: [member("A", 0), member("B", 0, true)] });
  assert.equal(result.action, "start");
  assert.deepEqual(result.episode, { season: 1, episode: 1 });
  assert.equal(result.label, "Start S1E1");
});

test("both mid-show resolves to the earlier position, not the average", () => {
  const result = resolveStartHere({ episodes, members: [member("A", 2), member("B", 2, true)] });
  assert.equal(result.action, "continue");
  assert.deepEqual(result.episode, { season: 2, episode: 1 });
  assert.equal(result.label, "You're both at S2E1");
  assert.deepEqual(result.restart, { season: 1, episode: 1 });
});

test("one episode apart is still a shared position", () => {
  const result = resolveStartHere({ episodes, members: [member("A", 2), member("B", 3, true)] });
  assert.equal(result.action, "continue");
  assert.deepEqual(result.episode, { season: 2, episode: 1 });
});

test("two or more apart names who is ahead", () => {
  const result = resolveStartHere({ episodes, members: [member("M", 0), member("A", 3, true)] });
  assert.equal(result.action, "ahead");
  assert.deepEqual(result.episode, { season: 1, episode: 1 });
  assert.match(result.warning ?? "", /A is 3 episodes ahead/);
});

test("someone finished while the other has not: start where the lagging one is", () => {
  const result = resolveStartHere({ episodes, members: [member("A", 4), member("B", 1, true)] });
  assert.equal(result.action, "ahead");
  assert.deepEqual(result.episode, { season: 1, episode: 2 });
  assert.match(result.warning ?? "", /A is 3 episodes ahead/);
});

test("everyone caught up on an ended show is finished, with no position", () => {
  const result = resolveStartHere({ episodes, members: [member("A", 4)], status: "ended" });
  assert.equal(result.action, "finished");
  assert.equal(result.label, "Series finished");
  assert.equal(result.episode, undefined);
});

test("everyone caught up on a running show is caught up", () => {
  const result = resolveStartHere({ episodes, members: [member("A", 4)], status: "continuing" });
  assert.equal(result.action, "finished");
  assert.equal(result.label, "You're caught up");
});

test("no episodes means no invented answer", () => {
  const result = resolveStartHere({ episodes: [], members: [member("A", 0)] });
  assert.equal(result.action, "unavailable");
  assert.equal(result.episode, undefined);
});

test("no members falls back to S1E1", () => {
  const result = resolveStartHere({ episodes, members: [] });
  assert.equal(result.action, "start");
  assert.deepEqual(result.episode, { season: 1, episode: 1 });
});

test("out-of-range positions are clamped, not thrown", () => {
  const result = resolveStartHere({ episodes, members: [member("A", 99), member("B", -3, true)] });
  assert.equal(result.action, "ahead");
  assert.deepEqual(result.episode, { season: 1, episode: 1 });
});
