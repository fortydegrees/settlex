import { describe, expect, it } from "vitest";
import {
  applyDevScenarioSetup,
  extractScenarioState,
  validateScenarioSetupData
} from "../gameSetup/devScenarios";

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

describe("dev scenario setup helpers", () => {
  it("extracts scenario state from current and legacy wrappers", () => {
    expect(extractScenarioState(scenarioState)).toBe(scenarioState);
    expect(extractScenarioState({ G: scenarioState })).toBe(scenarioState);
    expect(extractScenarioState({ state: scenarioState })).toBe(scenarioState);
    expect(extractScenarioState({ core: { players: null } })).toBeNull();
  });

  it("validates production and player-count guardrails", () => {
    expect(
      validateScenarioSetupData(
        { devScenarioState: scenarioState },
        2,
        { nodeEnv: "production" }
      )
    ).toBe("Dev scenarios are disabled in production.");
    expect(
      validateScenarioSetupData(
        { devScenarioState: scenarioState },
        3,
        { nodeEnv: "test" }
      )
    ).toBe("Scenario requires 2 players.");
  });

  it("merges a dev scenario and seeds boardgame context outside production", () => {
    const initialState = {
      core: {
        players: ["0", "1"],
        phase: "placement",
        turn: { currentPlayerId: "0", phase: "preRoll" }
      },
      valids: { nodes: [1], edges: [], tiles: [] },
      preGame: { readyByPlayerId: {} }
    };
    const ctx = {
      numPlayers: 2,
      phase: "preGame",
      currentPlayer: "0",
      playOrder: ["0", "1"],
      playOrderPos: 0,
      activePlayers: { "0": "waiting", "1": "waiting" }
    };

    const nextState = applyDevScenarioSetup({
      initialState,
      ctx,
      setupData: { devScenarioState: scenarioState },
      nodeEnv: "test"
    });

    expect(nextState.core.phase).toBe("normal");
    expect(nextState.preGame).toEqual(initialState.preGame);
    expect(ctx.phase).toBe("main");
    expect(ctx.currentPlayer).toBe("1");
    expect(ctx.activePlayers).toEqual({ "0": null, "1": "postRoll" });
  });
});
