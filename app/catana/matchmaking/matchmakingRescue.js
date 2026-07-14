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

const secureHexToken = (cryptoImpl) => {
  if (!cryptoImpl?.getRandomValues) {
    throw new Error("Secure browser randomness is required for matchmaking.");
  }
  const bytes = new Uint8Array(24);
  cryptoImpl.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export function createMatchmakingMutationIdentity({
  cryptoImpl = globalThis.crypto,
} = {}) {
  return {
    requestId: secureHexToken(cryptoImpl),
    credentials: secureHexToken(cryptoImpl),
  };
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
  preserve,
  commit,
}) {
  if (!isSearchGenerationCurrent({ searchGenerationRef, generation })) {
    let cleaned = false;
    try {
      cleaned = await leaveSeat(seat);
    } catch {
      cleaned = false;
    }
    if (!cleaned) preserve?.(seat);
    return { committed: false, cleaned };
  }

  const result = commit(seat);
  return { committed: true, result };
}

const matchPlayers = (match) =>
  (Array.isArray(match?.players)
    ? match.players
    : Object.values(match?.players ?? {}))
    .filter(Boolean);

export async function reconcileSearchDeparture({
  seat,
  accountId,
  leaveSeat,
  loadMatch,
} = {}) {
  try {
    if (await leaveSeat?.(seat)) {
      return { released: true, reason: "left" };
    }
  } catch (error) {
    if (error?.status === 403) {
      return { released: true, reason: "credentials_rejected" };
    }
    if (error?.status === 404 || error?.status === 410) {
      return { released: true, reason: "match_gone" };
    }
    /* Reconcile the ambiguous mutation against authoritative match state. */
  }

  try {
    const match = await loadMatch?.(seat?.matchID);
    if (!accountId) return { released: false, reason: "ownership_unknown" };
    const stillOwned = matchPlayers(match).some(
      (player) => player?.data?.accountId === accountId
    );
    return stillOwned
      ? { released: false, reason: "still_owned" }
      : { released: true, reason: "ownership_cleared" };
  } catch (error) {
    if (error?.status === 404 || error?.status === 410) {
      return { released: true, reason: "match_gone" };
    }
    return { released: false, reason: "reconcile_failed" };
  }
}

export async function reconcileUnknownSearchMutation({
  mutation,
  accountId,
  recoverSeats,
  leaveSeat,
  loadMatch,
} = {}) {
  if (!mutation?.credentials) {
    return { released: false, reason: "credentials_unknown", seats: [] };
  }

  let recovered = false;
  let targets;
  try {
    if (mutation.matchID && mutation.playerID != null) {
      targets = [
        {
          matchID: mutation.matchID,
          playerID: String(mutation.playerID),
        },
      ];
    } else {
      recovered = true;
      targets = await recoverSeats?.(mutation.requestId);
    }
  } catch {
    return { released: false, reason: "recovery_failed", seats: [] };
  }

  const seats = (Array.isArray(targets) ? targets : [])
    .filter((seat) => seat?.matchID && seat?.playerID != null)
    .map((seat) => ({
      matchID: seat.matchID,
      playerID: String(seat.playerID),
      credentials: mutation.credentials,
    }));
  if (seats.length === 0) {
    return { released: false, reason: "outcome_pending", seats: [] };
  }

  for (const seat of seats) {
    const result = await reconcileSearchDeparture({
      seat,
      accountId,
      leaveSeat,
      loadMatch,
    });
    if (!result.released) {
      return { released: false, reason: result.reason, seats };
    }
  }

  return {
    released: true,
    reason: recovered ? "recovered_and_left" : "known_seat_released",
    seats,
  };
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
