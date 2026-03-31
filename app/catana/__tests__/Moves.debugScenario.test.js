import { describe, expect, it } from "vitest";
import {
  DEBUG_captureScenarioState,
  DEBUG_clearCapturedScenarioState
} from "../Moves";

describe("debug scenario snapshot moves", () => {
  it("captures an authoritative scenario snapshot on G", () => {
    const context = {
      G: {
        core: {
          players: ["0", "1"],
          devDeck: ["knight", "monopoly"],
          playerStateById: {
            "0": { devCards: ["knight"], resources: ["Wood"] },
            "1": { devCards: ["victoryPoint"], resources: ["Ore"] }
          }
        }
      }
    };

    DEBUG_captureScenarioState.move(context);

    expect(context.G.debugScenarioState).toEqual({
      core: {
        players: ["0", "1"],
        devDeck: ["knight", "monopoly"],
        playerStateById: {
          "0": { devCards: ["knight"], resources: ["Wood"] },
          "1": { devCards: ["victoryPoint"], resources: ["Ore"] }
        }
      }
    });
    expect(context.G.debugScenarioState).not.toBe(context.G);
  });

  it("clears captured scenario state after export", () => {
    const context = {
      G: {
        core: { players: ["0", "1"] },
        debugScenarioState: { core: { players: ["0", "1"] } }
      }
    };

    DEBUG_clearCapturedScenarioState.move(context);

    expect(context.G.debugScenarioState).toBe(null);
  });
});
