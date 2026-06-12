import { describe, expect, it } from "vitest";
import {
  getBotFallbackMove,
  getStageTimeoutMove,
  isBotActionStage,
  resolveStageKey
} from "../stagePolicy.js";

const baseState = (overrides = {}) => ({
  G: { core: {} },
  ctx: {
    phase: "main",
    currentPlayer: "0",
    activePlayers: { "0": "postRoll" },
    turn: 1
  },
  ...overrides
});

describe("server stage policy", () => {
  it("resolves forced dev-card and road-building stages from game state", () => {
    expect(
      resolveStageKey(
        baseState({
          G: {
            devCardPlay: {
              type: "monopoly",
              playerId: "0",
              startedFromStage: "postRoll"
            }
          },
          ctx: {
            phase: "main",
            currentPlayer: "0",
            activePlayers: { "0": "devCardChoice" },
            turn: 4
          }
        })
      )
    ).toBe("main:devCardChoice");

    expect(
      resolveStageKey(
        baseState({
          G: {
            devCardPlay: {
              type: "roadBuilding",
              playerId: "0",
              pendingRoads: 1
            }
          },
          ctx: {
            phase: "main",
            currentPlayer: "0",
            activePlayers: { "0": "postRoll" },
            turn: 5
          }
        })
      )
    ).toBe("main:roadBuilding");
  });

  it("keeps timeout moves and bot fallbacks on the same stage keys", () => {
    expect(getStageTimeoutMove("main:devCardChoice")).toBe("autoResolveDevCard");
    expect(
      getBotFallbackMove(
        baseState({
          G: {
            devCardPlay: {
              type: "yearOfPlenty",
              playerId: "0",
              startedFromStage: "postRoll"
            }
          },
          ctx: {
            phase: "main",
            currentPlayer: "0",
            activePlayers: { "0": "devCardChoice" },
            turn: 6
          }
        })
      )
    ).toBe("autoResolveDevCard");

    expect(isBotActionStage("main:devCardChoice")).toBe(true);
  });
});
