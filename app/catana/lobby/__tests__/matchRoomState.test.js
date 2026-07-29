import { describe, expect, it } from "vitest";
import {
  buildInterruptedDuelLeavePayload,
  buildPufferBotJoinPayload,
  resolveInterruptedDuelLeaveFailure,
  resolveLiveMatchClientMode,
  resolveOpenSeatSelection,
} from "../matchRoomState.js";

describe("match room state", () => {
  it("keeps interrupted recovery ahead of credentialed and spectator board modes", () => {
    expect(
      resolveLiveMatchClientMode({
        interruptedDuel: true,
        credentials: "secret",
        playerID: "1",
        isSpectating: true,
      })
    ).toBe("interrupted");
    expect(
      resolveLiveMatchClientMode({
        credentials: "secret",
        playerID: "1",
      })
    ).toBe("player");
    expect(resolveLiveMatchClientMode({ isSpectating: true })).toBe(
      "spectator"
    );
    expect(resolveLiveMatchClientMode()).toBe("room");
  });

  it("never retargets a credentialed, challenge, or spectator seat", () => {
    const openSeats = [{ id: 0, name: "" }, { id: 1, name: "" }];

    expect(
      resolveOpenSeatSelection({
        credentials: "secret",
        openSeats,
        playerID: "1",
      })
    ).toBe("1");
    expect(
      resolveOpenSeatSelection({
        pendingChallengeState: { status: "pending" },
        openSeats,
        playerID: "1",
      })
    ).toBe("1");
    expect(
      resolveOpenSeatSelection({
        spectatorMode: true,
        openSeats,
        playerID: "1",
      })
    ).toBe("1");
  });

  it("selects the first open seat only when the current room selection is invalid", () => {
    const openSeats = [{ id: 2, name: "" }, { id: 3, name: "" }];

    expect(
      resolveOpenSeatSelection({ openSeats, playerID: "3" })
    ).toBe("3");
    expect(
      resolveOpenSeatSelection({ openSeats, playerID: "1" })
    ).toBe("2");
    expect(
      resolveOpenSeatSelection({ openSeats: [], playerID: "1" })
    ).toBe("1");
  });

  it("builds the external join payload for each Puffer seat", () => {
    expect(
      buildPufferBotJoinPayload({
        matchID: "room-42",
        seat: { id: 2 },
      })
    ).toEqual({
      matchID: "room-42",
      playerID: "2",
      participantType: "bot",
      botKey: "puffer",
      botName: "Puffer 3",
      avatarEmoji: "🤖",
      avatarColor: "royal",
    });
  });

  it("builds the credentialed matchmaking-cancel payload for recovery", () => {
    expect(
      buildInterruptedDuelLeavePayload({
        matchID: "duel-42",
        playerID: "1",
        credentials: "secret-1",
      })
    ).toEqual({
      matchID: "duel-42",
      playerID: "1",
      credentials: "secret-1",
      intent: "matchmaking_cancel",
    });
  });

  it("refreshes a duel that filled concurrently and surfaces other leave errors", () => {
    expect(
      resolveInterruptedDuelLeaveFailure({
        code: "MATCH_FOUND",
        message: "Another player joined.",
      })
    ).toEqual({
      refreshMatch: true,
      message: "",
    });
    expect(
      resolveInterruptedDuelLeaveFailure(
        new Error("The duel could not be released.")
      )
    ).toEqual({
      refreshMatch: false,
      message: "The duel could not be released.",
    });
    expect(resolveInterruptedDuelLeaveFailure(null)).toEqual({
      refreshMatch: false,
      message: "Failed to leave the interrupted duel.",
    });
  });
});
