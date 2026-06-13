import { describe, expect, it } from "vitest";
import { makeDeterministicRng } from "@settlex/game-core";
import {
  createInitialGameState,
  getPlacementOrder,
  resolveModeSetup
} from "../gameSetup/initialState";

const createRandom = (seed = 123) => ({
  Number: makeDeterministicRng(seed),
  Shuffle: (items) => items
});

describe("initial game setup helpers", () => {
  it("builds snake placement order by player count", () => {
    expect(getPlacementOrder(1)).toEqual(["0"]);
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

  it("resolves explicit and default mode setup", () => {
    expect(resolveModeSetup({ numPlayers: 2, setupData: {} })).toMatchObject({
      modeId: "duel",
      rulesetId: "duel",
      boardConfigId: "standard-balanced"
    });
    expect(
      resolveModeSetup({
        numPlayers: 3,
        setupData: { boardConfig: { specId: "standard4p" } }
      })
    ).toMatchObject({
      modeId: "standard-3p",
      rulesetId: "standard",
      boardConfigId: "custom"
    });
  });

  it("creates deterministic initial game state for the selected mode", () => {
    const ctx = { numPlayers: 2, phase: "placement" };
    const G = createInitialGameState({
      ctx,
      random: createRandom(),
      setupData: {}
    });

    expect(G.modeId).toBe("duel");
    expect(G.rulesetId).toBe("duel");
    expect(G.boardConfigId).toBe("standard-balanced");
    expect(G.core.phase).toBe("placement");
    expect(G.core.ruleset.friendlyRobber).toEqual({
      enabled: true,
      vpThreshold: 2
    });
    expect(G.diceState?.mode).toBe("balanced");
    expect(G.placementOrder).toEqual(["0", "1", "1", "0"]);
  });

  it("requires board generation to use boardgame.io random", () => {
    expect(() =>
      createInitialGameState({
        ctx: { numPlayers: 2, phase: "placement" },
        random: {},
        setupData: {}
      })
    ).toThrow("random.Number is required for deterministic board generation.");
  });
});
