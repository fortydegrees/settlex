import { describe, expect, it } from "vitest";
import { getGameStatus, STATUS_TYPES } from "../utils/gameStatus";

describe("getGameStatus", () => {
  const baseCoreState = {
    phase: "normal",
    turn: {
      phase: "preRoll",
      currentPlayerId: "0",
      pendingDiscards: [],
    },
    players: ["0", "1"],
  };

  const baseCtx = {
    phase: "main",
    currentPlayer: "0",
    activePlayers: { "0": "preRoll" },
  };

  describe("rolling status", () => {
    it("returns rolling status when in preRoll stage", () => {
      const status = getGameStatus(baseCoreState, baseCtx);
      expect(status.statusType).toBe(STATUS_TYPES.ROLLING);
      expect(status.text).toBe("Roll Dice");
      expect(status.activePlayerId).toBe("0");
    });
  });

  describe("preGame status", () => {
    it("returns waiting status during preGame", () => {
      const core = {
        phase: "normal",
        turn: {
          phase: "preRoll",
          currentPlayerId: "0",
          pendingDiscards: []
        },
        players: ["0", "1"]
      };
      const ctx = {
        phase: "preGame",
        currentPlayer: "0",
        activePlayers: { all: "waiting" }
      };
      const status = getGameStatus(core, ctx);
      expect(status.statusType).toBe(STATUS_TYPES.THINKING);
      expect(status.text).toBe("Waiting to start");
    });
  });

  describe("thinking status", () => {
    it("returns thinking status when in postRoll stage", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "postRoll" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "postRoll" } };
      const status = getGameStatus(core, ctx);
      expect(status.statusType).toBe(STATUS_TYPES.THINKING);
      expect(status.text).toBe("Your Turn");
    });
  });

  describe("robber statuses", () => {
    it("returns moving_robber status when in robberMove phase", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "robberMove" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "moveRobber" } };
      const status = getGameStatus(core, ctx);
      expect(status.statusType).toBe(STATUS_TYPES.MOVING_ROBBER);
      expect(status.text).toBe("Move Robber");
    });

    it("returns stealing status when in robberSteal phase", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "robberSteal" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "stealResource" } };
      const status = getGameStatus(core, ctx);
      expect(status.statusType).toBe(STATUS_TYPES.STEALING);
      expect(status.text).toBe("Choose Player");
    });

    it("returns discarding status when in robberDiscard phase", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "robberDiscard", pendingDiscards: ["0"] } };
      const ctx = { ...baseCtx, activePlayers: { "0": "robberDiscard" } };
      const status = getGameStatus(core, ctx);
      expect(status.statusType).toBe(STATUS_TYPES.DISCARDING);
      expect(status.text).toBe("Discard Cards");
    });
  });

  describe("placement phase statuses", () => {
    it("returns placing_settlement during placement phase", () => {
      const core = { ...baseCoreState, phase: "placement" };
      const ctx = { ...baseCtx, phase: "placement" };
      const status = getGameStatus(core, ctx);
      expect(status.statusType).toBe(STATUS_TYPES.PLACING_SETTLEMENT);
      expect(status.text).toBe("Place Settlement");
    });
  });

  describe("build action statuses", () => {
    it("returns placing_road when playerAction is placeRoad", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "postRoll" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "postRoll" } };
      const status = getGameStatus(core, ctx, "placeRoad");
      expect(status.statusType).toBe(STATUS_TYPES.PLACING_ROAD);
      expect(status.text).toBe("Place Road");
    });

    it("returns placing_settlement when playerAction is placeSettlement", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "postRoll" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "postRoll" } };
      const status = getGameStatus(core, ctx, "placeSettlement");
      expect(status.statusType).toBe(STATUS_TYPES.PLACING_SETTLEMENT);
      expect(status.text).toBe("Place Settlement");
    });

    it("returns placing_city when playerAction is placeCity", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "postRoll" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "postRoll" } };
      const status = getGameStatus(core, ctx, "placeCity");
      expect(status.statusType).toBe(STATUS_TYPES.PLACING_CITY);
      expect(status.text).toBe("Place City");
    });

    it("returns placing_road when playerAction is roadBuilding", () => {
      const core = { ...baseCoreState, turn: { ...baseCoreState.turn, phase: "postRoll" } };
      const ctx = { ...baseCtx, activePlayers: { "0": "postRoll" } };
      const status = getGameStatus(core, ctx, "roadBuilding");
      expect(status.statusType).toBe(STATUS_TYPES.PLACING_ROAD);
      expect(status.text).toBe("Place Road");
    });
  });
});
