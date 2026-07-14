import { describe, expect, it } from "vitest";
import {
  BOARD_SOURCE_IDS,
  resolveDefaultGameModeId,
  resolveGameMode
} from "./catanaGameModes.js";

describe("Catana product modes", () => {
  it("maps duel to the fair catalog source", () => {
    expect(resolveGameMode("duel")).toEqual({
      id: "duel",
      numPlayers: 2,
      rulesetId: "duel",
      boardSourceId: BOARD_SOURCE_IDS.DUEL_FAIR_OFFICIAL_V1
    });
  });

  it.each([
    [3, "standard-3p"],
    [4, "standard-4p"]
  ])("maps %i players to generated official spiral", (numPlayers, modeId) => {
    expect(resolveGameMode(modeId)).toMatchObject({
      numPlayers,
      rulesetId: "standard",
      boardSourceId: BOARD_SOURCE_IDS.GENERATED_OFFICIAL_SPIRAL_V1
    });
  });

  it.each([[2, "duel"], [3, "standard-3p"], [4, "standard-4p"]])(
    "resolves the default for %i players",
    (numPlayers, modeId) => {
      expect(resolveDefaultGameModeId(numPlayers)).toBe(modeId);
    }
  );

  it("rejects unknown modes", () => {
    expect(() => resolveGameMode("turbo")).toThrow("Unknown game mode: turbo");
  });
});
