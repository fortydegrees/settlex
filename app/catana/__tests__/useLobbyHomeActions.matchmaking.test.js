import { describe, expect, it, vi } from "vitest";
import { runAccountSignOutLifecycle } from "../lobby/useLobbyHomeActions.js";
import * as lobbyActions from "../lobby/useLobbyHomeActions.js";

vi.mock("../matchAlerts/useMatchAlerts.js", () => ({
  useMatchAlerts: vi.fn(),
}));

describe("useLobbyHomeActions matchmaking rescue", () => {
  it("marks a committed match for board-ready audio before navigation", () => {
    const commitGameStartNavigation = lobbyActions.commitGameStartNavigation;
    expect(commitGameStartNavigation).toBeTypeOf("function");
    if (typeof commitGameStartNavigation !== "function") return;

    const events = [];
    const matchID = commitGameStartNavigation({
      created: {
        matchID: "puffer-match",
        playerID: "1",
        playerCredentials: "puffer-credentials",
      },
      account: { currentUsername: "Ada" },
      persistJoinedSeat: (seat) => events.push(["persist", seat]),
      markGameStart: (targetMatchID) =>
        events.push(["mark", targetMatchID]),
      navigate: (href) => events.push(["navigate", href]),
    });

    expect(matchID).toBe("puffer-match");
    expect(events).toEqual([
      [
        "persist",
        {
          matchID: "puffer-match",
          playerID: "1",
          credentials: "puffer-credentials",
          playerName: "Ada",
        },
      ],
      ["mark", "puffer-match"],
      ["navigate", "/g/puffer-match"],
    ]);
  });

  // Queue, cancellation, bot handoff and cleanup behavior are exercised with
  // real React DOM in lobby/PublicMatchmaking.stories.jsx.
});

describe("useLobbyHomeActions sign-out lifecycle", () => {
  it("detaches the authenticated browser before logout and refreshes after logout", async () => {
    const order = [];
    const detachResult = {
      detached: true,
      safeToSignOut: true,
      reason: "detached",
    };

    await runAccountSignOutLifecycle({
      detachCurrentBrowser: async (options) => {
        order.push("detach");
        expect(options).toEqual({ refreshAfterDetach: false });
        return detachResult;
      },
      logout: async () => order.push("logout"),
      completeMatchAlertSignOut: (result) => {
        order.push("complete");
        expect(result).toBe(detachResult);
      },
      refreshMatchAlerts: async () => order.push("refresh"),
    });

    expect(order).toEqual(["detach", "logout", "complete", "refresh"]);
  });

  it("blocks logout when the server association cannot be detached", async () => {
    const logout = vi.fn();
    const completeMatchAlertSignOut = vi.fn();

    await expect(
      runAccountSignOutLifecycle({
        detachCurrentBrowser: vi.fn().mockResolvedValue({
          detached: false,
          safeToSignOut: false,
          reason: "server_detach_failed",
          error: new Error("Detach unavailable"),
        }),
        logout,
        completeMatchAlertSignOut,
        refreshMatchAlerts: vi.fn(),
      })
    ).rejects.toThrow("Detach unavailable");

    expect(logout).not.toHaveBeenCalled();
    expect(completeMatchAlertSignOut).not.toHaveBeenCalled();
  });

  it("continues sign-out when only local unsubscribe fails after server detach", async () => {
    const order = [];
    const reportDetachWarning = vi.fn();

    await runAccountSignOutLifecycle({
      detachCurrentBrowser: async () => {
        order.push("detach");
        return {
          detached: false,
          safeToSignOut: true,
          reason: "local_unsubscribe_failed",
          error: new Error("Browser kept subscription"),
        };
      },
      logout: async () => order.push("logout"),
      completeMatchAlertSignOut: () => order.push("complete"),
      refreshMatchAlerts: async () => order.push("refresh"),
      reportDetachWarning,
    });

    expect(order).toEqual(["detach", "logout", "complete", "refresh"]);
    expect(reportDetachWarning).toHaveBeenCalledWith(
      "Browser kept subscription",
      expect.any(Error)
    );
  });

  it("uses the browser check instead of a possibly stale subscription snapshot", async () => {
    const detachCurrentBrowser = vi.fn().mockResolvedValue({
      detached: true,
      safeToSignOut: true,
      reason: "not_subscribed",
    });
    const logout = vi.fn().mockResolvedValue(undefined);
    const completeMatchAlertSignOut = vi.fn();

    await runAccountSignOutLifecycle({
      detachCurrentBrowser,
      logout,
      completeMatchAlertSignOut,
      refreshMatchAlerts: vi.fn(),
    });

    expect(detachCurrentBrowser).toHaveBeenCalledOnce();
    expect(logout).toHaveBeenCalledOnce();
    expect(completeMatchAlertSignOut).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "not_subscribed" })
    );
  });

  it("does not clear provider state when logout fails", async () => {
    const refreshMatchAlerts = vi.fn();
    const completeMatchAlertSignOut = vi.fn();

    await expect(
      runAccountSignOutLifecycle({
        detachCurrentBrowser: vi.fn().mockResolvedValue({
          detached: true,
          safeToSignOut: true,
          reason: "not_subscribed",
        }),
        logout: vi.fn().mockRejectedValue(new Error("Logout unavailable")),
        completeMatchAlertSignOut,
        refreshMatchAlerts,
      })
    ).rejects.toThrow("Logout unavailable");

    expect(completeMatchAlertSignOut).not.toHaveBeenCalled();
    expect(refreshMatchAlerts).not.toHaveBeenCalled();
  });
});

describe("useLobbyHomeActions account establishment", () => {
  it("refreshes match alerts after the account becomes available", async () => {
    expect(lobbyActions.runAccountEstablishedLifecycle).toBeTypeOf("function");
    const order = [];
    const account = { id: "acct_1", currentUsername: "Ada" };

    await expect(
      lobbyActions.runAccountEstablishedLifecycle({
        account,
        applyAccountIdentity: (value) => order.push(["account", value]),
        refreshMatchAlerts: async () => order.push(["alerts"]),
      })
    ).resolves.toBe(account);

    expect(order).toEqual([
      ["account", account],
      ["alerts"],
    ]);
  });
});
