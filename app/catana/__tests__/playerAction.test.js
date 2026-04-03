import { describe, expect, it } from "vitest";
import {
  getBuildPickupPieceType,
  shouldResetPlayerAction
} from "../utils/playerAction";

const baseCtx = {
  phase: "main",
  currentPlayer: "0",
  activePlayers: { "0": "postRoll" }
};

describe("shouldResetPlayerAction", () => {
  it("maps explicit build actions to dock pickup piece types", () => {
    expect(getBuildPickupPieceType("placeRoad")).toBe("road");
    expect(getBuildPickupPieceType("placeSettlement")).toBe("settlement");
    expect(getBuildPickupPieceType("placeCity")).toBe("city");
    expect(getBuildPickupPieceType("moveRobber")).toBe(null);
    expect(getBuildPickupPieceType(null)).toBe(null);
  });

  it("keeps placeRoad action while player can still build", () => {
    expect(
      shouldResetPlayerAction({
        playerAction: "placeRoad",
        playerID: "0",
        ctx: baseCtx,
        corePhase: "normal",
        isGameOver: false
      })
    ).toBe(false);
  });

  it("resets placeRoad action when turn passes to another player", () => {
    expect(
      shouldResetPlayerAction({
        playerAction: "placeRoad",
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

  it("resets placeCity action when stage is no longer postRoll", () => {
    expect(
      shouldResetPlayerAction({
        playerAction: "placeCity",
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
});
