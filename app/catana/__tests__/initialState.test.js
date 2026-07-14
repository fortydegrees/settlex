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
      boardSourceId: "duel-fair-official-v1"
    });
    expect(
      resolveModeSetup({
        numPlayers: 3,
        setupData: { boardConfig: { specId: "standard4p" } }
      })
    ).toMatchObject({
      modeId: "standard-3p",
      rulesetId: "standard",
      boardSourceId: "custom"
    });
  });

  it("rejects conflicting and obsolete board setup inputs", () => {
    expect(() => resolveModeSetup({
      numPlayers: 2,
      setupData: {
        boardSourceId: "generated-random-v1",
        boardConfig: { specId: "standard-4p" }
      }
    })).toThrow("boardConfig and boardSourceId are mutually exclusive");

    expect(() => resolveModeSetup({
      numPlayers: 2,
      setupData: { boardConfigId: "standard-random" }
    })).toThrow("setupData.boardConfigId is not supported; use boardSourceId");
  });

  it("creates deterministic initial game state for the selected mode", () => {
    const ctx = { numPlayers: 2, phase: "placement" };
    const G = createInitialGameState({
      ctx,
      random: {
        Number: () => 0,
        Shuffle: (items) => items
      },
      setupData: {}
    });

    expect(G.modeId).toBe("duel");
    expect(G.rulesetId).toBe("duel");
    expect(G.boardSourceId).toBe("duel-fair-official-v1");
    expect(G.boardConfigId).toBe("standard-official-spiral");
    expect(G.boardProvenance).toMatchObject({
      sourceKind: "catalog",
      catalogId: "duel-fair-official-v1",
      catalogRank: 1,
      generatorVersion: "official-spiral-v1",
    });
    expect(G.core.phase).toBe("placement");
    expect(G.core.ruleset.friendlyRobber).toEqual({
      enabled: true,
      vpThreshold: 2
    });
    expect(G.diceState?.mode).toBe("balanced");
    expect(G.placementOrder).toEqual(["0", "1", "1", "0"]);
  });

  it("keeps explicit and non-duel board generation outside the duel catalog", () => {
    const explicitRandom = createInitialGameState({
      ctx: { numPlayers: 2, phase: "placement" },
      random: createRandom(),
      setupData: { boardSourceId: "generated-random-v1" }
    });
    const standardThreePlayer = createInitialGameState({
      ctx: { numPlayers: 3, phase: "placement" },
      random: createRandom(),
      setupData: {}
    });

    expect(explicitRandom.boardSourceId).toBe("generated-random-v1");
    expect(explicitRandom.boardConfigId).toBe("standard-random");
    expect(explicitRandom.boardProvenance).toEqual({
      sourceKind: "generated",
      generatorFamily: "freeform-random",
      generatorVersion: "freeform-random-v1"
    });
    expect(standardThreePlayer.boardSourceId).toBe("generated-official-spiral-v1");
    expect(standardThreePlayer.boardConfigId).toBe("standard-official-spiral");
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
