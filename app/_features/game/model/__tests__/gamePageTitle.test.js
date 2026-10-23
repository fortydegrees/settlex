import { describe, expect, it } from "vitest";
import { getGamePageTitle } from "../gamePageTitle.js";

describe("game page title", () => {
  it("uses the opponent's HUD name rather than the local player's name", () => {
    expect(getGamePageTitle({ playerID: "0", nameMap: { 0: "David", 1: "Puffer" } }))
      .toBe("Game vs Puffer · SettleHex");
    expect(getGamePageTitle({ playerID: 1, nameMap: { 0: "Alex", 1: "David" } }))
      .toBe("Game vs Alex · SettleHex");
  });

  it("uses a generic game title for spectators or missing opponent metadata", () => {
    expect(getGamePageTitle({ playerID: null, nameMap: { 0: "Alex", 1: "David" } }))
      .toBe("Game · SettleHex");
    expect(getGamePageTitle({ playerID: "0", nameMap: { 0: "David" } }))
      .toBe("Game · SettleHex");
  });

  it("keeps replay titles independent of perspective and results", () => {
    expect(getGamePageTitle({ isReplay: true, playerID: "0", nameMap: { 0: "David", 1: "Puffer" } }))
      .toBe("Replay · SettleHex");
    expect(getGamePageTitle({ isReplay: true, playerID: null }))
      .toBe("Replay · SettleHex");
  });
});
