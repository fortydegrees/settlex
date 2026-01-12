import { describe, expect, it } from "vitest";
import { Catan, getPlacementOrder } from "../Game";

describe("placement order", () => {
  it("builds a snake order for the placement phase", () => {
    expect(getPlacementOrder(2)).toEqual(["0", "1", "1", "0"]);
    expect(getPlacementOrder(4)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "3",
      "2",
      "1",
      "0"
    ]);
  });

  it("stores placement order in G during setup", () => {
    const ctx = { numPlayers: 3, phase: "placement" };
    const random = {
      Number: () => 0.5,
      Shuffle: (arr) => arr
    };
    const G = Catan.setup({ ctx, random });

    expect(G.placementOrder).toEqual(getPlacementOrder(3));
  });
});
