import { describe, expect, it } from "vitest";
import { buildPlayerViewMap } from "../utils/playerView";

describe("buildPlayerViewMap", () => {
  it("includes knightsPlayed in the player view", () => {
    const core = {
      players: ["0"],
      playerStateById: {
        "0": {
          resources: [],
          roadsRemaining: 1,
          settlementsRemaining: 2,
          citiesRemaining: 3,
          devCards: [],
          knightsPlayed: 4
        }
      }
    };

    const view = buildPlayerViewMap(core);
    expect(view["0"].knightsPlayed).toBe(4);
  });

  it("prefers provided player color metadata over seat fallback colors", () => {
    const core = { players: ["0", "1"], playerStateById: { "0": {}, "1": {} } };
    const view = buildPlayerViewMap(core, { "0": "gold" });
    expect(view["0"].color).toBe("gold");
    expect(view["1"].color).toBe("sky");
  });
});
