import { describe, expect, it } from "vitest";
import {
  getDiscardRequirement,
  getHasBlockingModal,
  getTurnCommandState,
  getVisibleDiceRoll
} from "../utils/gameScreenCommandState";

const mainCtx = {
  phase: "main",
  currentPlayer: "0",
  activePlayers: { "0": "preRoll" }
};

const normalCore = {
  phase: "normal"
};

describe("gameScreenCommandState", () => {
  it("shows dice only after an authoritative roll exists", () => {
    expect(getVisibleDiceRoll({ core: { turn: { hasRolled: false } } })).toBeNull();
    expect(
      getVisibleDiceRoll({
        core: { turn: { hasRolled: true } },
        diceRoll: [3]
      })
    ).toBeNull();
    expect(
      getVisibleDiceRoll({
        core: { turn: { hasRolled: true } },
        diceRoll: [3, 4]
      })
    ).toEqual([3, 4]);
  });

  it("derives discard requirements without assuming a local player model", () => {
    expect(
      getDiscardRequirement({
        isGameOver: false,
        coreTurn: { pendingDiscards: ["0"] },
        playerID: "0",
        player: { resources: ["Wood", "Brick", "Ore", "Wheat", "Sheep"] }
      })
    ).toEqual({
      needsToDiscard: true,
      discardCount: 2
    });

    expect(
      getDiscardRequirement({
        isGameOver: false,
        coreTurn: { pendingDiscards: ["0"] },
        playerID: "0",
        player: null
      })
    ).toEqual({
      needsToDiscard: true,
      discardCount: 0
    });

    expect(
      getDiscardRequirement({
        isGameOver: true,
        coreTurn: { pendingDiscards: ["0"] },
        playerID: "0",
        player: { resources: ["Wood", "Brick"] }
      })
    ).toEqual({
      needsToDiscard: false,
      discardCount: 0
    });
  });

  it("derives roll and end-turn command availability from turn state", () => {
    expect(
      getTurnCommandState({
        isGameOver: false,
        playerID: "0",
        ctx: mainCtx,
        core: normalCore,
        coreTurn: { phase: "preRoll", hasRolled: false, pendingDiscards: [] }
      })
    ).toEqual({
      canRoll: true,
      canEnd: false
    });

    expect(
      getTurnCommandState({
        isGameOver: false,
        playerID: "0",
        ctx: {
          ...mainCtx,
          activePlayers: { "0": "postRoll" }
        },
        core: normalCore,
        coreTurn: { phase: "postRoll", hasRolled: true, pendingDiscards: [] }
      })
    ).toEqual({
      canRoll: false,
      canEnd: true
    });

    expect(
      getTurnCommandState({
        isGameOver: false,
        playerID: "0",
        ctx: {
          ...mainCtx,
          activePlayers: { "0": "postRoll" }
        },
        core: normalCore,
        coreTurn: { phase: "postRoll", hasRolled: true, pendingDiscards: ["1"] }
      }).canEnd
    ).toBe(false);
  });

  it("summarizes blocking modal state for keyboard shortcuts", () => {
    expect(
      getHasBlockingModal({
        tradeModalVisible: false,
        needsToDiscard: false,
        devPlayModalVisible: false,
        showGameOverModal: false,
        showPostgame: false,
        showGameSettings: false,
        showGameRules: false
      })
    ).toBe(false);

    expect(
      getHasBlockingModal({
        tradeModalVisible: false,
        needsToDiscard: true,
        devPlayModalVisible: false,
        showGameOverModal: false,
        showPostgame: false,
        showGameSettings: false,
        showGameRules: false
      })
    ).toBe(true);
  });
});
