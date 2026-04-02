import { describe, expect, it } from "vitest";
import {
  canRenderDevPlayModal,
  shouldResetTradeModal
} from "../utils/turnUiState";

const baseCtx = {
  phase: "main",
  currentPlayer: "0",
  activePlayers: { "0": "postRoll" }
};

describe("turnUiState", () => {
  describe("shouldResetTradeModal", () => {
    it("keeps the trade modal open while the viewer still owns postRoll", () => {
      expect(
        shouldResetTradeModal({
          showTradeModal: true,
          playerID: "0",
          ctx: baseCtx,
          corePhase: "normal",
          isGameOver: false
        })
      ).toBe(false);
    });

    it("closes the trade modal when the turn passes to another player", () => {
      expect(
        shouldResetTradeModal({
          showTradeModal: true,
          playerID: "0",
          ctx: {
            phase: "main",
            currentPlayer: "1",
            activePlayers: { "1": "preRoll" }
          },
          corePhase: "normal",
          isGameOver: false
        })
      ).toBe(true);
    });

    it("closes the trade modal when the viewer leaves postRoll", () => {
      expect(
        shouldResetTradeModal({
          showTradeModal: true,
          playerID: "0",
          ctx: {
            phase: "main",
            currentPlayer: "0",
            activePlayers: { "0": "moveRobber" }
          },
          corePhase: "normal",
          isGameOver: false
        })
      ).toBe(true);
    });
  });

  describe("canRenderDevPlayModal", () => {
    it("renders a player-owned Year of Plenty dialog during preRoll", () => {
      expect(
        canRenderDevPlayModal({
          devPlay: { type: "yearOfPlenty", playerId: "0" },
          playerID: "0",
          ctx: {
            phase: "main",
            currentPlayer: "0",
            activePlayers: { "0": "preRoll" }
          },
          corePhase: "normal",
          isGameOver: false
        })
      ).toBe(true);
    });

    it("hides the dev-card dialog after the turn has passed", () => {
      expect(
        canRenderDevPlayModal({
          devPlay: { type: "yearOfPlenty", playerId: "0" },
          playerID: "0",
          ctx: {
            phase: "main",
            currentPlayer: "1",
            activePlayers: { "1": "preRoll" }
          },
          corePhase: "normal",
          isGameOver: false
        })
      ).toBe(false);
    });
  });
});
