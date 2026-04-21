import { describe, expect, it } from "vitest";
import {
  resolveDefaultGameModeId,
  resolveGameMode,
  type GameModeId
} from "./gameModes";

describe("game mode registry", () => {
  it("defines duel as a two-player balanced-board mode", () => {
    const mode = resolveGameMode("duel");

    expect(mode).toEqual({
      id: "duel",
      numPlayers: 2,
      rulesetId: "duel",
      boardConfigId: "standard-balanced"
    });
  });

  it.each([
    [2, "duel"],
    [3, "standard-3p"],
    [4, "standard-4p"]
  ] satisfies Array<[number, GameModeId]>)(
    "defaults %i-player matches to %s",
    (numPlayers, expectedModeId) => {
      expect(resolveDefaultGameModeId(numPlayers)).toBe(expectedModeId);
    }
  );

  it("rejects unknown mode ids", () => {
    expect(() => resolveGameMode("turbo")).toThrow("Unknown game mode: turbo");
  });
});
