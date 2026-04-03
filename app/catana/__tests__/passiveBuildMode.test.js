import { describe, expect, it } from "vitest";
import { isPassiveBuildEnabled } from "../utils/passiveBuildMode";

const baseCtx = {
  phase: "main",
  currentPlayer: "0",
  activePlayers: { "0": "postRoll" }
};

describe("isPassiveBuildEnabled", () => {
  it("enables passive hover only for the local postRoll player with no explicit action", () => {
    expect(
      isPassiveBuildEnabled({
        playerAction: null,
        playerID: "0",
        ctx: baseCtx,
        corePhase: "normal",
        devCardPlay: null
      })
    ).toBe(true);
  });

  it("disables passive hover when an explicit build action is armed", () => {
    expect(
      isPassiveBuildEnabled({
        playerAction: "placeSettlement",
        playerID: "0",
        ctx: baseCtx,
        corePhase: "normal",
        devCardPlay: null
      })
    ).toBe(false);
  });

  it("disables passive hover while road-building placement is armed", () => {
    expect(
      isPassiveBuildEnabled({
        playerAction: "roadBuilding",
        playerID: "0",
        ctx: baseCtx,
        corePhase: "normal",
        devCardPlay: null
      })
    ).toBe(false);
  });

  it("disables passive hover outside normal postRoll turns", () => {
    expect(
      isPassiveBuildEnabled({
        playerAction: null,
        playerID: "0",
        ctx: {
          phase: "placement",
          currentPlayer: "0",
          activePlayers: { "0": "settlement" }
        },
        corePhase: "placement",
        devCardPlay: null
      })
    ).toBe(false);

    expect(
      isPassiveBuildEnabled({
        playerAction: null,
        playerID: "0",
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "moveRobber" }
        },
        corePhase: "normal",
        devCardPlay: null
      })
    ).toBe(false);
  });

  it("disables passive hover during road-building dev-card resolution", () => {
    expect(
      isPassiveBuildEnabled({
        playerAction: null,
        playerID: "0",
        ctx: baseCtx,
        corePhase: "normal",
        devCardPlay: { type: "roadBuilding", playerId: "0" }
      })
    ).toBe(false);
  });
});
