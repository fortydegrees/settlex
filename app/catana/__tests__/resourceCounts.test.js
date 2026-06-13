import { describe, expect, it } from "vitest";
import { countResources } from "../moves/resourceCounts";

describe("resource counting", () => {
  it("groups repeated resources by count", () => {
    expect(countResources(["Wood", "Wood", "Brick"])).toEqual({
      Wood: 2,
      Brick: 1
    });
  });

  it("returns an empty object for missing resources", () => {
    expect(countResources()).toEqual({});
  });
});
