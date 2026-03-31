import { describe, expect, it, vi } from "vitest";
import { Catan } from "../Game";

describe("Catan setup board config", () => {
  it("uses boardConfigId from setupData", () => {
    const ctx = { numPlayers: 2, phase: "placement" };
    const random = {
      Number: () => 0.5,
      Shuffle: (items) => items
    };
    const setupData = { boardConfigId: "standard-random" };

    const G = Catan.setup({ ctx, random }, setupData);

    expect(G.boardConfigId).toBe("standard-random");
  });

  it("defaults 2-player setup to duel ruleset", () => {
    const ctx = { numPlayers: 2, phase: "placement" };
    const random = {
      Number: () => 0.5,
      Shuffle: (items) => items
    };

    const G = Catan.setup({ ctx, random }, {});

    expect(G.core.ruleset.victoryPointsToWin).toBe(15);
    expect(G.core.ruleset.discardLimit).toBe(9);
  });

  it("keeps standard ruleset defaults for 3+ players", () => {
    const ctx = { numPlayers: 3, phase: "placement" };
    const random = {
      Number: () => 0.5,
      Shuffle: (items) => items
    };

    const G = Catan.setup({ ctx, random }, {});

    expect(G.core.ruleset.victoryPointsToWin).toBe(10);
    expect(G.core.ruleset.discardLimit).toBe(7);
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
        Number: () => 0.5,
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
      expect(ctx.activePlayers).toEqual({ "1": "postRoll" });
    } finally {
      process.env.NODE_ENV = previousEnv;
      vi.resetModules();
    }
  });
});
