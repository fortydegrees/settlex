import { describe, expect, it } from "vitest";
import { shouldAutoReady } from "../utils/preGameReady";

describe("preGameReady", () => {
  it("waits for multiplayer sync metadata before auto-readying", () => {
    expect(
      shouldAutoReady({
        readySent: false,
        playerID: "0",
        phase: "preGame",
        hasReadyMove: true,
        isMultiplayer: true,
        isConnected: true,
        matchData: undefined,
        readyByPlayerId: {}
      })
    ).toBe(false);
  });

  it("auto-readies once multiplayer sync metadata is present", () => {
    expect(
      shouldAutoReady({
        readySent: false,
        playerID: "0",
        phase: "preGame",
        hasReadyMove: true,
        isMultiplayer: true,
        isConnected: true,
        matchData: [{ id: 0, name: "Ada" }, { id: 1, name: "Bea" }],
        readyByPlayerId: {}
      })
    ).toBe(true);
  });

  it("does not resend readyUp after the server already marked the player ready", () => {
    expect(
      shouldAutoReady({
        readySent: false,
        playerID: "0",
        phase: "preGame",
        hasReadyMove: true,
        isMultiplayer: true,
        isConnected: true,
        matchData: [{ id: 0, name: "Ada" }, { id: 1, name: "Bea" }],
        readyByPlayerId: { "0": true }
      })
    ).toBe(false);
  });
});
