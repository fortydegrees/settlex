import { describe, expect, it, vi } from "vitest";
import { makeDeterministicRng } from "@settlex/game-core";
import { Catan } from "../Game";

const createRandom = (seed = 123) => ({
  Number: makeDeterministicRng(seed),
  Shuffle: (items) => items
});

describe("Catan setup board config", () => {
  it("keeps non-current seats Stage.NULL-active so they can use global moves", () => {
    expect(Catan.phases.placement.turn.activePlayers).toEqual({
      currentPlayer: "settlement",
      others: null
    });
    expect(Catan.phases.main.turn.activePlayers).toEqual({
      currentPlayer: "preRoll",
      others: null
    });
  });

  it("uses boardConfigId from setupData", () => {
    const ctx = { numPlayers: 2, phase: "placement" };
    const random = createRandom();
    const setupData = { boardConfigId: "standard-random" };

    const G = Catan.setup({ ctx, random }, setupData);

    expect(G.boardConfigId).toBe("standard-random");
  });

  it("resolves duel mode to duel rules and balanced board generation", () => {
    const ctx = { numPlayers: 2, phase: "placement" };
    const random = createRandom();

    const G = Catan.setup({ ctx, random }, { modeId: "duel" });

    expect(G.modeId).toBe("duel");
    expect(G.rulesetId).toBe("duel");
    expect(G.boardConfigId).toBe("standard-balanced");
    expect(G.core.ruleset.victoryPointsToWin).toBe(15);
    expect(G.core.ruleset.diceMode).toBe("balanced");
    expect(G.diceState?.mode).toBe("balanced");
  });

  it("defaults 2-player setup to duel ruleset", () => {
    const ctx = { numPlayers: 2, phase: "placement" };
    const random = createRandom();

    const G = Catan.setup({ ctx, random }, {});

    expect(G.modeId).toBe("duel");
    expect(G.boardConfigId).toBe("standard-balanced");
    expect(G.core.ruleset.victoryPointsToWin).toBe(15);
    expect(G.core.ruleset.discardLimit).toBe(9);
    expect(G.core.ruleset.diceMode).toBe("balanced");
    expect(G.diceState?.mode).toBe("balanced");
  });

  it("keeps standard ruleset defaults for 3+ players", () => {
    const ctx = { numPlayers: 3, phase: "placement" };
    const random = createRandom();

    const G = Catan.setup({ ctx, random }, {});

    expect(G.modeId).toBe("standard-3p");
    expect(G.boardConfigId).toBe("standard-official");
    expect(G.core.ruleset.victoryPointsToWin).toBe(10);
    expect(G.core.ruleset.discardLimit).toBe(7);
    expect(G.core.ruleset.diceMode).toBe("random");
    expect(G.diceState).toBeNull();
  });

  it("defaults Year of Plenty bank counts to hidden", () => {
    const ctx = { numPlayers: 3, phase: "placement" };
    const random = createRandom();

    const G = Catan.setup({ ctx, random }, {});

    expect(G.gameSettings.showYearOfPlentyBankCounts).toBe(false);
  });

  it("preserves an explicit Year of Plenty bank count setting from setupData", () => {
    const ctx = { numPlayers: 3, phase: "placement" };
    const random = createRandom();

    const G = Catan.setup(
      { ctx, random },
      { gameSettings: { showYearOfPlentyBankCounts: true } }
    );

    expect(G.gameSettings.showYearOfPlentyBankCounts).toBe(true);
  });

  it("boots dev scenarios into the saved turn context outside production", async () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    vi.resetModules();

    try {
      const { Catan: DevCatan } = await import("../Game");
      const ctx = {
        numPlayers: 2,
        phase: "preGame",
        currentPlayer: "0",
        playOrder: ["0", "1"],
        playOrderPos: 0,
        activePlayers: { "0": "waiting", "1": "waiting" }
      };
      const random = {
        Number: makeDeterministicRng(123),
        Shuffle: (items) => items
      };
      const scenarioState = {
        core: {
          players: ["0", "1"],
          phase: "normal",
          turn: {
            currentPlayerId: "1",
            phase: "postRoll",
            pendingDiscards: []
          }
        },
        valids: { nodes: [], edges: [], tiles: [] }
      };

      const G = DevCatan.setup(
        { ctx, random },
        { devScenarioState: scenarioState }
      );

      expect(G.core.phase).toBe("normal");
      expect(ctx.phase).toBe("main");
      expect(ctx.currentPlayer).toBe("1");
      expect(ctx.activePlayers).toEqual({ "0": null, "1": "postRoll" });
    } finally {
      process.env.NODE_ENV = previousEnv;
      vi.resetModules();
    }
  });
});
