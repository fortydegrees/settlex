import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canResumePausedMatch,
  getHumanAccountsAfterJoin,
  pauseAlertsAfterHumanJoin,
  reserveAlertsBeforeHumanJoin,
  restoreAlertsAfterFailedHumanJoin,
} from "../matchAlerts/humanMatchAlertPause.js";

describe("human match alert pause", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns both humans only when the joining seat fills the match", () => {
    const liveMatch = {
      matchID: "match_1",
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: { participantType: "human", accountId: "acct_ada" },
        },
        1: { id: 1, name: "" },
      },
    };

    expect(
      getHumanAccountsAfterJoin({
        liveMatch,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        participantType: "human",
      })
    ).toEqual(["acct_ada", "acct_bren"]);
    expect(
      getHumanAccountsAfterJoin({
        liveMatch,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        participantType: "bot",
      })
    ).toEqual([]);
  });

  it("pauses alerts only for humans in a newly filled match", async () => {
    const pauseMatchAlerts = vi.fn().mockResolvedValue(["acct_ada", "acct_bren"]);
    const liveMatch = {
      matchID: "match_1",
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: { participantType: "human", accountId: "acct_ada" },
        },
        1: { id: 1, name: "" },
      },
    };

    await expect(
      pauseAlertsAfterHumanJoin({
        liveMatch,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        participantType: "bot",
        pauseMatchAlerts,
      })
    ).resolves.toEqual([]);
    expect(pauseMatchAlerts).not.toHaveBeenCalled();

    await expect(
      pauseAlertsAfterHumanJoin({
        liveMatch,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        participantType: "human",
        pauseMatchAlerts,
      })
    ).resolves.toEqual(["acct_ada", "acct_bren"]);
    expect(pauseMatchAlerts).toHaveBeenCalledWith({
      accountIds: ["acct_ada", "acct_bren"],
      matchID: "match_1",
    });
  });

  it("reserves and restores the pause around the visible seat mutation", async () => {
    const reservation = {
      matchID: "match_1",
      pausedAccountIds: ["acct_ada", "acct_bren"],
      previousPreferences: [],
    };
    const reserveMatchAlerts = vi.fn().mockResolvedValue(reservation);
    const restoreReservation = vi.fn().mockResolvedValue(["acct_ada"]);
    const liveMatch = {
      matchID: "match_1",
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: { participantType: "human", accountId: "acct_ada" },
        },
        1: { id: 1, name: "" },
      },
    };

    await expect(
      reserveAlertsBeforeHumanJoin({
        liveMatch,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        participantType: "human",
        reserveMatchAlerts,
      })
    ).resolves.toBe(reservation);
    expect(reserveMatchAlerts).toHaveBeenCalledWith({
      accountIds: ["acct_ada", "acct_bren"],
      matchID: "match_1",
    });

    await expect(
      restoreAlertsAfterFailedHumanJoin({
        reservation,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        joinError: Object.assign(new Error("seat already filled"), { status: 409 }),
        getLiveMatchImpl: vi.fn().mockResolvedValue(liveMatch),
        restoreReservation,
      })
    ).resolves.toEqual(["acct_ada"]);
    expect(restoreReservation).toHaveBeenCalledWith({ reservation });
  });

  it("keeps an ambiguous or committed join paused and restores only a proven failure", async () => {
    const reservation = {
      matchID: "match_1",
      reservationId: "22222222-2222-4222-8222-222222222222",
      pausedAccountIds: ["acct_ada", "acct_bren"],
      previousPreferences: [],
    };
    const filledMatch = {
      matchID: "match_1",
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: { participantType: "human", accountId: "acct_ada" },
        },
        1: {
          id: 1,
          name: "Bren",
          data: { participantType: "human", accountId: "acct_bren" },
        },
      },
    };
    const restoreReservation = vi.fn().mockResolvedValue(["acct_ada"]);
    const finalizeReservation = vi.fn().mockResolvedValue(["acct_ada", "acct_bren"]);

    await expect(
      restoreAlertsAfterFailedHumanJoin({
        reservation,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        joinError: Object.assign(new Error("seat already filled"), { status: 409 }),
        getLiveMatchImpl: vi.fn().mockResolvedValue(filledMatch),
        restoreReservation,
        finalizeReservation,
      })
    ).resolves.toEqual([]);
    expect(restoreReservation).not.toHaveBeenCalled();
    expect(finalizeReservation).toHaveBeenCalledWith({ reservation });

    finalizeReservation.mockClear();
    const loadAfterAmbiguousError = vi.fn().mockResolvedValue({
      matchID: "match_1",
      players: {
        0: filledMatch.players[0],
        1: { id: 1, name: "" },
      },
    });
    await expect(
      restoreAlertsAfterFailedHumanJoin({
        reservation,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        joinError: new Error("socket closed before the response arrived"),
        getLiveMatchImpl: loadAfterAmbiguousError,
        restoreReservation,
        finalizeReservation,
      })
    ).resolves.toEqual([]);
    expect(restoreReservation).not.toHaveBeenCalled();
    expect(finalizeReservation).not.toHaveBeenCalled();
    expect(loadAfterAmbiguousError).not.toHaveBeenCalled();

    await expect(
      restoreAlertsAfterFailedHumanJoin({
        reservation,
        joiningAccountId: "acct_bren",
        joiningPlayerId: "1",
        joinError: Object.assign(new Error("match missing"), { status: 404 }),
        getLiveMatchImpl: vi
          .fn()
          .mockRejectedValue(Object.assign(new Error("gone"), { status: 404 })),
        restoreReservation,
        finalizeReservation,
      })
    ).resolves.toEqual(["acct_ada"]);
    expect(restoreReservation).toHaveBeenCalledWith({ reservation });
  });

  it("resumes only after the recorded match is over or gone", async () => {
    const active = vi.fn().mockResolvedValue({
      matchID: "m1",
      gameover: false,
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: { participantType: "human" },
        },
        1: {
          id: 1,
          name: "Bren",
          data: { participantType: "human" },
        },
      },
    });
    const interruptedBeforeJoin = vi.fn().mockResolvedValue({
      matchID: "m1",
      gameover: false,
      players: {
        0: {
          id: 0,
          name: "Ada",
          data: { participantType: "human" },
        },
        1: { id: 1, name: "" },
      },
    });
    const finished = vi
      .fn()
      .mockResolvedValue({ matchID: "m1", gameover: { winner: "0" } });
    const gone = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("missing"), { status: 404 }));

    await expect(
      canResumePausedMatch({ matchID: "m1", getLiveMatchImpl: active })
    ).resolves.toBe(false);
    await expect(
      canResumePausedMatch({
        matchID: "m1",
        getLiveMatchImpl: interruptedBeforeJoin,
      })
    ).resolves.toBe(true);
    await expect(
      canResumePausedMatch({ matchID: "m1", getLiveMatchImpl: finished })
    ).resolves.toBe(true);
    await expect(
      canResumePausedMatch({ matchID: "m1", getLiveMatchImpl: gone })
    ).resolves.toBe(true);
  });

  it("preserves lobby response status when deciding whether a missing match can resume", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "missing" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await expect(canResumePausedMatch({ matchID: "m1" })).resolves.toBe(true);
  });
});
