import assert from "node:assert/strict";
import test from "node:test";

import { mapWithConcurrency } from "./concurrency";

test("keeps result order regardless of completion order", async () => {
  const delays = [30, 1, 20, 2];
  const result = await mapWithConcurrency([0, 1, 2, 3], 2, async (value) => {
    await new Promise((resolve) => setTimeout(resolve, delays[value]));
    return value * 10;
  });
  assert.deepEqual(result, [0, 10, 20, 30]);
});

test("never exceeds the width and uses every slot", async () => {
  let active = 0;
  let peak = 0;
  await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return null;
  });
  assert.equal(peak, 3);
});

test("a width larger than the input is clamped", async () => {
  let active = 0;
  let peak = 0;
  await mapWithConcurrency([1, 2], 10, async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    return null;
  });
  assert.equal(peak, 2);
});

test("an empty input resolves to an empty array without calling fn", async () => {
  let calls = 0;
  const result = await mapWithConcurrency([], 5, async () => {
    calls += 1;
    return 1;
  });
  assert.deepEqual(result, []);
  assert.equal(calls, 0);
});
