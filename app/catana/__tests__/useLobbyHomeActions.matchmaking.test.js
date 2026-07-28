import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runAccountSignOutLifecycle } from "../lobby/useLobbyHomeActions.js";
import * as lobbyActions from "../lobby/useLobbyHomeActions.js";

vi.mock("../matchAlerts/useMatchAlerts.js", () => ({
  useMatchAlerts: vi.fn(),
}));

const readHook = () =>
  readFileSync(
    resolve(process.cwd(), "app/catana/lobby/useLobbyHomeActions.js"),
    "utf8"
  );

const between = (source, start, end) =>
  source.slice(source.indexOf(start), source.indexOf(end));

describe("useLobbyHomeActions matchmaking rescue", () => {
  it("does not announce when ordinary play joins an existing duel", () => {
    const playSource = between(
      readHook(),
      "const play = useCallback",
      "const createFriendChallenge"
    );
    const existingDuelBranch = between(
      playSource,
      "if (openMatch)",
      "const account = await ensureAccountSession"
    );

    expect(existingDuelBranch).toContain("createdNewPublicDuel: false");
    expect(existingDuelBranch).not.toContain("scheduleMatchAnnouncement");
  });

  it("marks and schedules only a genuinely new public duel", () => {
    const playSource = between(
      readHook(),
      "const play = useCallback",
      "const createFriendChallenge"
    );
    const createdDuelBranch = playSource.slice(
      playSource.indexOf('route: "/api/matches/create"')
    );

    expect(createdDuelBranch).toContain("createdNewPublicDuel: true");
    expect(createdDuelBranch).toContain(
      "Create succeeded but returned no credentials."
    );
    expect(createdDuelBranch).toContain("scheduleMatchAnnouncement({");
    expect(createdDuelBranch).toContain("requestAnnouncement");
  });

  it("clears delayed announcements for every queue-ending transition", () => {
    const source = readHook();
    const unmountCleanupIndex = source.indexOf("mountedRef.current = false");
    const unmountSource = source.slice(
      unmountCleanupIndex - 80,
      unmountCleanupIndex + 240
    );
    const pollingSource = between(
      source,
      "const poll = async () =>",
      "const id = setInterval(poll, 1500)"
    );
    const cancelSource = between(
      source,
      "const cancelSearch = useCallback",
      "const openIdentity"
    );
    const pufferSource = between(
      source,
      "const playPufferFromSearch = useCallback",
      "const openIdentity"
    );

    expect(unmountSource).toContain("mountedRef.current = false");
    expect(unmountSource).toContain("advanceSearchGeneration(searchGenerationRef)");
    expect(unmountSource).toContain("clearScheduledMatchAnnouncement");
    expect(pollingSource).toContain("clearScheduledMatchAnnouncement");
    expect(cancelSource).toContain("clearScheduledMatchAnnouncement");
    expect(pufferSource).toContain("clearScheduledMatchAnnouncement");
    expect(source).toContain("announcedMatchIDRef.current = null");
  });

  it("invalidates stale async work on cancel, match-found, and unmount", () => {
    const source = readHook();
    const pollingSource = between(
      source,
      "const poll = async () =>",
      "const id = setInterval(poll, 1500)"
    );

    expect(source).toContain("const searchGenerationRef = useRef(0)");
    expect(source).toContain("mountedRef.current = true");
    expect(source).toContain("advanceSearchGeneration(searchGenerationRef)");
    expect(pollingSource).toContain("finishSearchPoll({");
    expect(pollingSource).toContain("unresolvedSearchMutationRef.current");
    expect(source).toContain("commitSearchSeat({");
  });

  it("keeps announcement results independent from polling state", () => {
    const source = readHook();
    const schedulingStart = source.indexOf("scheduleMatchAnnouncement({");
    const schedulingSource = source.slice(schedulingStart, schedulingStart + 220);

    expect(schedulingSource).toContain("requestAnnouncement");
    expect(schedulingSource).not.toContain("setSearchState(null)");
    expect(schedulingSource).not.toContain("router.push");
  });

  it("owns elapsed display state and resets it before each search", () => {
    const source = readHook();
    const playSource = between(
      source,
      "const play = useCallback",
      "const createFriendChallenge"
    );

    expect(source).toContain("const [searchElapsedSeconds, setSearchElapsedSeconds]");
    expect(source).toContain("getSearchElapsedSeconds(searchState.startedAt)");
    expect(playSource).toContain("setSearchElapsedSeconds(0)");
    expect(source).toContain("searchElapsedSeconds,");
    expect(source).toContain("createdNewPublicDuel:");
  });

  it("exposes a Puffer transition that awaits search cancellation", () => {
    const source = readHook();
    const pufferSource = between(
      source,
      "const playPufferFromSearch = useCallback",
      "const openIdentity"
    );

    expect(pufferSource).toContain("playPufferAfterLeavingSearch({");
    expect(pufferSource).toContain("cancelSearch");
    expect(pufferSource).toContain("playAgainstBot");
    expect(source).toContain("playPufferFromSearch,");
  });

  it("keeps the queue active whenever an authoritative leave cannot be confirmed", () => {
    const source = readHook();
    const cancelSource = between(
      source,
      "const cancelSearch = useCallback",
      "const playPufferFromSearch"
    );

    expect(cancelSource).toContain("reconcileSearchDeparture");
    expect(cancelSource).toContain("still queued");
    expect(cancelSource).toContain("return false");
    expect(cancelSource).toContain("setSearchState((current) =>");
    expect(cancelSource).not.toContain("preserveOnLeaveFailure");
  });

  it("enters a duel instead of cancelling when the opponent has already joined", () => {
    const source = readHook();
    const leaveSource = between(
      source,
      "const leaveSearchSeat = useCallback",
      "const recoverMatchmakingSeats"
    );
    const cancelSource = between(
      source,
      "const cancelSearch = useCallback",
      "const playPufferFromSearch"
    );

    expect(source).toContain("code: details?.code");
    expect(leaveSource).toContain('intent: "matchmaking_cancel"');
    expect(cancelSource).toContain('departure.reason === "match_found"');
    expect(cancelSource).toContain("router.push(`/g/${matchID}`)");
  });

  it("treats an interrupted join mutation as unsafe for a Puffer transition", () => {
    const source = readHook();
    const joinSource = between(
      source,
      "const joinRoom = useCallback",
      "const play = useCallback"
    );
    const requestIndex = joinSource.indexOf('route: "/api/matches/join"');
    const unsafeIndex = joinSource.indexOf("seatRequestStarted = true");

    expect(joinSource).toContain("let seatRequestStarted = false");
    expect(unsafeIndex).toBeGreaterThan(-1);
    expect(unsafeIndex).toBeLessThan(requestIndex);
    expect(joinSource).toContain("return !seatRequestStarted");
    expect(joinSource).toContain("createMatchmakingMutationIdentity");
    expect(joinSource).toContain("unresolvedSearchMutationRef.current = mutation");
    expect(joinSource).toContain("requestedCredentials: mutation.credentials");
    expect(joinSource).toContain("matchmakingRequestId: mutation.requestId");
    expect(joinSource.indexOf("setSearchState((current)")).toBeLessThan(requestIndex);
  });

  it("marks create unsafe before the server mutation can outlive cancellation", () => {
    const source = readHook();
    const playSource = between(
      source,
      "const play = useCallback",
      "const createFriendChallenge"
    );
    const createRequestIndex = playSource.indexOf('route: "/api/matches/create"');
    const unsafeIndex = playSource.indexOf("operationSafeToTransition = false");

    expect(unsafeIndex).toBeGreaterThan(-1);
    expect(unsafeIndex).toBeLessThan(createRequestIndex);
    expect(playSource).toContain("createMatchmakingMutationIdentity");
    expect(playSource).toContain("unresolvedSearchMutationRef.current = mutation");
    expect(playSource).toContain("requestedCredentials: mutation.credentials");
    expect(playSource).toContain("matchmakingRequestId: mutation.requestId");
  });

  it("authoritatively reconciles an unresolved mutation on every later cancel", () => {
    const source = readHook();
    const cancelSource = between(
      source,
      "const cancelSearch = useCallback",
      "const playPufferFromSearch"
    );

    expect(source).toContain("const unresolvedSearchMutationRef = useRef(null)");
    expect(source).toContain('route: "/api/matches/recover"');
    expect(cancelSource).toContain("reconcileUnresolvedSearchMutation");
    expect(cancelSource).toContain("unresolvedSearchMutationRef.current");
    expect(cancelSource).toContain("return false");
  });

  it("keeps the lobby busy for the full Puffer transition", () => {
    const source = readHook();
    const pufferSource = between(
      source,
      "const playPufferFromSearch = useCallback",
      "const openIdentity"
    );

    expect(source).toMatch(
      /isBusy: Boolean\([\s\S]*searchState[\s\S]*challengeState[\s\S]*isPufferTransitionPending[\s\S]*activeActionId[\s\S]*\)/
    );
    expect(pufferSource).not.toContain("setSearchState");
    expect(source).toContain('setError(err?.message || "Failed to start bot match.")');
  });

  it("asks the server to create a bot-intent match in one client request", () => {
    const source = readHook();
    const botSource = between(
      source,
      "const playAgainstBot = useCallback",
      "const cancelChallengeInvite"
    );

    expect(botSource).toContain('route: "/api/matches/create"');
    expect(botSource).toContain('opponentType: "bot"');
    expect(botSource).not.toContain('route: "/api/matches/join"');
    expect(botSource.match(/appRequest\(\{/g)).toHaveLength(1);
  });
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
