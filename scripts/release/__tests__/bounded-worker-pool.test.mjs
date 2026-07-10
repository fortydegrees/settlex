import { describe, expect, it } from "vitest";
import {
  resolveConcurrency,
  runBounded
} from "../../lib/bounded-worker-pool.mjs";

describe("resolveConcurrency", () => {
  it("defaults to the smaller of four and the available CPU count", () => {
    expect(resolveConcurrency(undefined, 12)).toBe(4);
    expect(resolveConcurrency(undefined, 2)).toBe(2);
    expect(resolveConcurrency(undefined, 0)).toBe(1);
  });

  it("accepts explicit values in the supported range", () => {
    expect(resolveConcurrency("1", 12)).toBe(1);
    expect(resolveConcurrency("8", 2)).toBe(8);
  });

  it.each(["0", "9", "2.5", "nope"])(
    "rejects invalid value %s",
    (value) => {
      expect(() => resolveConcurrency(value, 4)).toThrow(
        "SETTLEX_APP_TEST_CONCURRENCY must be an integer from 1 to 8"
      );
    }
  );
});

describe("runBounded", () => {
  it("preserves result order while respecting the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    const results = await runBounded([30, 5, 15, 1], 2, async (delay) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, delay));
      active -= 1;
      return delay * 2;
    });

    expect(maxActive).toBe(2);
    expect(results).toEqual([60, 10, 30, 2]);
  });

  it("does not schedule new items after a worker rejects", async () => {
    const started = [];
    await expect(
      runBounded([0, 1, 2, 3], 1, async (item) => {
        started.push(item);
        if (item === 1) throw new Error("boom");
        return item;
      })
    ).rejects.toThrow("boom");
    expect(started).toEqual([0, 1]);
  });
});
