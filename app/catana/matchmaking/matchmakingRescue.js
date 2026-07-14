export const MATCH_ANNOUNCEMENT_DELAY_MS = 2000;

export function getMatchmakingRescueStage(elapsedSeconds) {
  const elapsed = Number.isFinite(elapsedSeconds)
    ? Math.max(0, elapsedSeconds)
    : 0;
  if (elapsed >= 30) return "puffer";
  if (elapsed >= 12) return "alerts";
  return "waiting";
}

export function getSearchElapsedSeconds(startedAt, now = Date.now()) {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function advanceSearchGeneration(searchGenerationRef) {
  searchGenerationRef.current += 1;
  return searchGenerationRef.current;
}

export function isSearchGenerationCurrent({
  searchGenerationRef,
  generation,
}) {
  return searchGenerationRef.current === generation;
}

export function finishSearchPoll({
  searchGenerationRef,
  generation,
  onMatchFound,
}) {
  if (!isSearchGenerationCurrent({ searchGenerationRef, generation })) {
    return false;
  }
  onMatchFound();
  return true;
}

export async function commitSearchSeat({
  searchGenerationRef,
  generation,
  seat,
  leaveSeat,
  commit,
}) {
  if (!isSearchGenerationCurrent({ searchGenerationRef, generation })) {
    const cleaned = await leaveSeat(seat);
    return { committed: false, cleaned };
  }

  const result = commit(seat);
  return { committed: true, result };
}

export function clearScheduledMatchAnnouncement({
  announcementTimerRef,
  clearTimeoutImpl = clearTimeout,
}) {
  if (announcementTimerRef.current == null) return;
  clearTimeoutImpl(announcementTimerRef.current);
  announcementTimerRef.current = null;
}

export function scheduleMatchAnnouncement({
  matchID,
  announcementTimerRef,
  announcedMatchIDRef,
  requestAnnouncement,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
}) {
  clearScheduledMatchAnnouncement({
    announcementTimerRef,
    clearTimeoutImpl,
  });

  if (!matchID || announcedMatchIDRef.current === matchID) return false;

  announcementTimerRef.current = setTimeoutImpl(() => {
    announcementTimerRef.current = null;
    if (announcedMatchIDRef.current === matchID) return;
    announcedMatchIDRef.current = matchID;

    try {
      void Promise.resolve(requestAnnouncement(matchID)).catch(() => {});
    } catch (err) {
      /* Announcement failure must never take ownership of the search. */
    }
  }, MATCH_ANNOUNCEMENT_DELAY_MS);

  return true;
}

export async function playPufferAfterLeavingSearch({
  cancelSearch,
  playAgainstBot,
  pufferTransitionPendingRef = { current: false },
  onPendingChange,
}) {
  if (pufferTransitionPendingRef.current) {
    return { started: false, reason: "pending" };
  }

  pufferTransitionPendingRef.current = true;
  onPendingChange?.(true);
  try {
    const leftSearch = await cancelSearch();
    if (leftSearch === false) {
      return { started: false, reason: "leave_failed" };
    }
    return await playAgainstBot();
  } finally {
    pufferTransitionPendingRef.current = false;
    onPendingChange?.(false);
  }
}
