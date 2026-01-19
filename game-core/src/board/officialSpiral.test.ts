import { describe, expect, it } from "vitest";
import { buildSpiralOrder } from "./officialSpiral";

const toKey = (c: [number, number, number]) => c.join(",");

describe("official spiral order", () => {
  it("returns correct counts for radius 2", () => {
    const spiral = buildSpiralOrder(2, 0);
    expect(spiral.length).toBe(19);
    const unique = new Set(spiral.map(toKey));
    expect(unique.size).toBe(19);
    expect(spiral[0]).toEqual([2, -2, 0]);
  });
});
