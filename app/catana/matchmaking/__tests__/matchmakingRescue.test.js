import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  advanceSearchGeneration,
  clearScheduledMatchAnnouncement,
  commitSearchSeat,
  finishSearchPoll,
  getMatchmakingRescueStage,
  getSearchElapsedSeconds,
  playPufferAfterLeavingSearch,
  scheduleMatchAnnouncement,
} from "../matchmakingRescue.js";

describe("getMatchmakingRescueStage", () => {
  it.each([
    [0, "waiting"],
    [11, "waiting"],
    [12, "alerts"],
    [29, "alerts"],
    [30, "puffer"],
  ])("maps %s seconds to %s", (seconds, stage) => {
    expect(getMatchmakingRescueStage(seconds)).toBe(stage);
  });
});

describe("matchmaking rescue timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules one announcement for a new public duel after 2000ms", async () => {
    const announcementTimerRef = { current: null };
    const announcedMatchIDRef = { current: null };
    const requestAnnouncement = vi.fn().mockResolvedValue({ announced: true });

    scheduleMatchAnnouncement({
      matchID: "new-duel",
      announcementTimerRef,
      announcedMatchIDRef,
      requestAnnouncement,
    });

    expect(requestAnnouncement).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1999);
    expect(requestAnnouncement).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(requestAnnouncement).toHaveBeenCalledTimes(1);
    expect(requestAnnouncement).toHaveBeenCalledWith("new-duel");

    await vi.advanceTimersByTimeAsync(5000);
    expect(requestAnnouncement).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending announcement without announcing", async () => {
    const announcementTimerRef = { current: null };
    const announcedMatchIDRef = { current: null };
    const requestAnnouncement = vi.fn();

    scheduleMatchAnnouncement({
      matchID: "cancelled-duel",
      announcementTimerRef,
      announcedMatchIDRef,
      requestAnnouncement,
    });
    clearScheduledMatchAnnouncement({ announcementTimerRef });
    await vi.advanceTimersByTimeAsync(2000);

    expect(requestAnnouncement).not.toHaveBeenCalled();
    expect(announcementTimerRef.current).toBeNull();
  });

  it("contains announcement errors instead of changing queue ownership", async () => {
    const announcementTimerRef = { current: null };
    const announcedMatchIDRef = { current: null };
    const requestAnnouncement = vi.fn().mockRejectedValue(new Error("offline"));

    scheduleMatchAnnouncement({
      matchID: "still-waiting",
      announcementTimerRef,
      announcedMatchIDRef,
      requestAnnouncement,
    });

    await vi.advanceTimersByTimeAsync(2000);
    expect(requestAnnouncement).toHaveBeenCalledTimes(1);
    expect(announcedMatchIDRef.current).toBe("still-waiting");
  });

  it("resets displayed elapsed time when a new search starts", () => {
    expect(getSearchElapsedSeconds(1_000, 8_900)).toBe(7);
    expect(getSearchElapsedSeconds(8_900, 8_900)).toBe(0);
  });
});

describe("Puffer rescue ordering", () => {
  it("awaits leaving the waiting duel before creating Puffer", async () => {
    const sequence = [];
    let finishLeave;
    const cancelSearch = vi.fn(
      () =>
        new Promise((resolve) => {
          finishLeave = () => {
            sequence.push("left");
            resolve();
          };
        })
    );
    const playAgainstBot = vi.fn(() => {
      sequence.push("puffer");
      return "created";
    });

    const resultPromise = playPufferAfterLeavingSearch({
      cancelSearch,
      playAgainstBot,
    });
    expect(playAgainstBot).not.toHaveBeenCalled();

    finishLeave();
    await expect(resultPromise).resolves.toBe("created");
    expect(sequence).toEqual(["left", "puffer"]);
  });

  it("does not create Puffer when the waiting-seat leave fails", async () => {
    const cancelSearch = vi.fn().mockResolvedValue(false);
    const playAgainstBot = vi.fn();

    await expect(
      playPufferAfterLeavingSearch({ cancelSearch, playAgainstBot })
    ).resolves.toEqual({ started: false, reason: "leave_failed" });
    expect(playAgainstBot).not.toHaveBeenCalled();
  });

  it("allows only one Puffer transition while leave is pending", async () => {
    const pufferTransitionPendingRef = { current: false };
    let finishLeave;
    const cancelSearch = vi.fn(
      () =>
        new Promise((resolve) => {
          finishLeave = () => resolve(true);
        })
    );
    const playAgainstBot = vi.fn().mockResolvedValue("created");

    const first = playPufferAfterLeavingSearch({
      cancelSearch,
      playAgainstBot,
      pufferTransitionPendingRef,
    });
    await expect(
      playPufferAfterLeavingSearch({
        cancelSearch,
        playAgainstBot,
        pufferTransitionPendingRef,
      })
    ).resolves.toEqual({ started: false, reason: "pending" });

    finishLeave();
    await expect(first).resolves.toBe("created");
    expect(cancelSearch).toHaveBeenCalledTimes(1);
    expect(playAgainstBot).toHaveBeenCalledTimes(1);
  });

  it("holds the pending state through bot setup and releases it on failure", async () => {
    const pufferTransitionPendingRef = { current: false };
    const pendingChanges = [];
    let rejectBotSetup;
    const cancelSearch = vi.fn().mockResolvedValue(true);
    const playAgainstBot = vi.fn(
      () =>
        new Promise((resolve, reject) => {
          rejectBotSetup = reject;
        })
    );

    const transition = playPufferAfterLeavingSearch({
      cancelSearch,
      playAgainstBot,
      pufferTransitionPendingRef,
      onPendingChange: (pending) => pendingChanges.push(pending),
    });

    await vi.waitFor(() => expect(playAgainstBot).toHaveBeenCalledTimes(1));
    expect(pufferTransitionPendingRef.current).toBe(true);
    expect(pendingChanges).toEqual([true]);

    rejectBotSetup(new Error("bot setup failed"));
    await expect(transition).rejects.toThrow("bot setup failed");
    expect(pufferTransitionPendingRef.current).toBe(false);
    expect(pendingChanges).toEqual([true, false]);
  });
});

describe("search lifecycle ownership", () => {
  it("suppresses a stale poll result after ownership is invalidated", () => {
    const searchGenerationRef = { current: 0 };
    const generation = advanceSearchGeneration(searchGenerationRef);
    const onMatchFound = vi.fn();

    advanceSearchGeneration(searchGenerationRef);
    const committed = finishSearchPoll({
      searchGenerationRef,
      generation,
      onMatchFound,
    });

    expect(committed).toBe(false);
    expect(onMatchFound).not.toHaveBeenCalled();
  });

  it("cleans a seat that resolves after cancellation instead of committing it", async () => {
    const searchGenerationRef = { current: 0 };
    const generation = advanceSearchGeneration(searchGenerationRef);
    const leaveSeat = vi.fn().mockResolvedValue(true);
    const commit = vi.fn();
    const seat = {
      matchID: "late-duel",
      playerID: "0",
      credentials: "late-creds",
    };

    advanceSearchGeneration(searchGenerationRef);
    await expect(
      commitSearchSeat({
        searchGenerationRef,
        generation,
        seat,
        leaveSeat,
        commit,
      })
    ).resolves.toEqual({ committed: false, cleaned: true });

    expect(leaveSeat).toHaveBeenCalledWith(seat);
    expect(commit).not.toHaveBeenCalled();
  });

  it("makes a create response harmless when unmount wins the race", async () => {
    const searchGenerationRef = { current: 0 };
    const generation = advanceSearchGeneration(searchGenerationRef);
    let resolveCreate;
    const createResponse = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    const leaveSeat = vi.fn().mockResolvedValue(true);
    const commit = vi.fn();
    const flow = (async () => {
      const seat = await createResponse;
      return commitSearchSeat({
        searchGenerationRef,
        generation,
        seat,
        leaveSeat,
        commit,
      });
    })();

    advanceSearchGeneration(searchGenerationRef);
    resolveCreate({
      matchID: "created-after-unmount",
      playerID: "0",
      credentials: "late-creds",
    });

    await expect(flow).resolves.toEqual({ committed: false, cleaned: true });
    expect(commit).not.toHaveBeenCalled();
    expect(leaveSeat).toHaveBeenCalledTimes(1);
  });
});
