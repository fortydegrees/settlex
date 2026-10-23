"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  advanceSearchGeneration,
  beginSearchCancellation,
  clearScheduledMatchAnnouncement,
  createMatchmakingMutationIdentity,
  finishSearchPoll,
  getSearchElapsedSeconds,
  isSearchGenerationCurrent,
  resolvePublicMatchmakingCancellation,
  resolvePublicMatchmakingSeat,
  scheduleMatchAnnouncement,
} from "./matchmakingRescue.js";
import {
  buildCancelPublicMatchmakingRequest,
  buildStartPublicMatchmakingRequest,
} from "./publicMatchmakingClient.js";
import { clearLastActiveMatch, readLastActiveMatch } from "../session/activeMatchStorage";
import { tabAttention } from "../../../../lib/client/tabAttention";

function normalizeMatch(raw) {
  const playersObj = raw?.players || {};
  const players = Object.values(playersObj).sort(
    (a, b) => (a?.id ?? 0) - (b?.id ?? 0)
  );
  return {
    matchID: raw?.matchID,
    gameName: raw?.gameName,
    players
  };
}

// Account bootstrap, shared seat/navigation policy and shared lobby feedback
// stay with the caller. This owner keeps the public queue's state and lifetime.
export function usePublicMatchmaking({
  request,
  ensureAccountSession,
  currentAccount,
  persistJoinedSeat,
  commitGameStartNavigation,
  requestAnnouncement,
  onGameStartTransition,
  setError,
  setActiveActionId
}) {
  const router = useRouter();
  const [searchState, setSearchState] = useState(null);
  const [searchElapsedSeconds, setSearchElapsedSeconds] = useState(0);
  const [isSearchCancelPending, setIsSearchCancelPending] = useState(false);
  const announcementTimerRef = useRef(null);
  const announcedMatchIDRef = useRef(null);
  const searchGenerationRef = useRef(0);
  const activeSearchMutationRef = useRef(null);
  const searchCancelPendingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!searchState?.startedAt || searchState.phase !== "searching") return;

    const updateElapsed = () => {
      setSearchElapsedSeconds(getSearchElapsedSeconds(searchState.startedAt));
    };
    updateElapsed();
    const id = setInterval(updateElapsed, 1000);
    return () => clearInterval(id);
  }, [searchState?.phase, searchState?.startedAt]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      advanceSearchGeneration(searchGenerationRef);
      clearScheduledMatchAnnouncement({ announcementTimerRef });
    };
  }, []);

  useEffect(() => {
    if (!searchState?.matchID || searchState.playerID == null) return;
    const generation = searchGenerationRef.current;

    const poll = async () => {
      try {
        const data = await request({
          route: `/api/matches/${searchState.matchID}`
        });
        const match = normalizeMatch(data);
        const allJoined = match.players.every((p) => p.name);
        if (allJoined) {
          finishSearchPoll({
            searchGenerationRef,
            generation,
            onMatchFound: () => {
              activeSearchMutationRef.current = null;
              clearScheduledMatchAnnouncement({ announcementTimerRef });
              advanceSearchGeneration(searchGenerationRef);
              tabAttention.request("match-found");
              try {
                onGameStartTransition?.(searchState.matchID);
              } catch (err) {
                /* The board-ready audio marker is best-effort. */
              }
              setSearchState((current) =>
                current && current.matchID === searchState.matchID
                  ? { ...current, phase: "matchFound" }
                  : current
              );
              router.push(`/g/${searchState.matchID}`);
            }
          });
        }
      } catch (err) {
        /* keep polling */
      }
    };

    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [onGameStartTransition, request, router, searchState]);

  const cancelPublicSearchRequest = useCallback(async (mutation) => {
    const response = await request(
      buildCancelPublicMatchmakingRequest({
        modeId: mutation.modeId,
        requestId: mutation.requestId,
        requestedCredentials: mutation.credentials,
      })
    );
    return resolvePublicMatchmakingCancellation(response);
  }, [request]);

  const play = useCallback(async () => {
    const startedAt = Date.now();
    const generation = advanceSearchGeneration(searchGenerationRef);
    activeSearchMutationRef.current = null;
    searchCancelPendingRef.current = false;
    setIsSearchCancelPending(false);
    let mutation = null;
    let account = null;
    clearScheduledMatchAnnouncement({ announcementTimerRef });
    announcedMatchIDRef.current = null;
    setSearchElapsedSeconds(0);
    setError("");
    setActiveActionId("queue");
    setSearchState({
      matchID: null,
      playerID: null,
      startedAt,
      phase: "searching",
      createdNewPublicDuel: false
    });

    try {
      account = await ensureAccountSession();
      if (
        !isSearchGenerationCurrent({ searchGenerationRef, generation })
      ) {
        return;
      }
      if (!account?.id) {
        throw new Error("Pick a username first.");
      }

      mutation = {
        ...createMatchmakingMutationIdentity(),
        accountId: account.id,
        modeId: "duel",
        matchID: null,
        playerID: null
      };
      activeSearchMutationRef.current = mutation;
      const created = await request(
        buildStartPublicMatchmakingRequest({
          modeId: mutation.modeId,
          requestId: mutation.requestId,
          requestedCredentials: mutation.credentials,
        })
      );

      const resolvedSeat = resolvePublicMatchmakingSeat(created);
      const {
        matchID,
        playerID,
        credentials,
        createdNewPublicDuel,
      } = resolvedSeat;
      mutation.matchID = matchID;
      mutation.playerID = playerID;
      mutation.credentials = credentials;

      if (!isSearchGenerationCurrent({ searchGenerationRef, generation })) {
        return;
      }

      if (createdNewPublicDuel) {
        persistJoinedSeat({
          matchID,
          playerID,
          credentials,
          playerName: account.currentUsername
        });
        setSearchState({
          matchID,
          playerID,
          startedAt,
          phase: "searching",
          createdNewPublicDuel: true
        });
        scheduleMatchAnnouncement({
          matchID,
          announcementTimerRef,
          announcedMatchIDRef,
          requestAnnouncement
        });
        return;
      }

      activeSearchMutationRef.current = null;
      commitGameStartNavigation({
        created: {
          matchID,
          playerID,
          playerCredentials: credentials,
        },
        account,
        persistJoinedSeat,
        markGameStart: onGameStartTransition,
        navigate: (href) => router.push(href),
      });
    } catch (err) {
      if (
        !isSearchGenerationCurrent({ searchGenerationRef, generation })
      ) {
        return;
      }
      clearScheduledMatchAnnouncement({ announcementTimerRef });
      if (mutation) {
        let cancellation;
        try {
          cancellation = await cancelPublicSearchRequest(mutation);
        } catch {
          cancellation = { released: false, reason: "uncertain", matchFound: null };
        }
        if (!mountedRef.current || !isSearchGenerationCurrent({ searchGenerationRef, generation })) {
          return;
        }
        if (cancellation.reason === "match_found") {
          activeSearchMutationRef.current = null;
          commitGameStartNavigation({
            created: {
              matchID: cancellation.matchFound.matchID,
              playerID: cancellation.matchFound.playerID,
              playerCredentials: cancellation.matchFound.credentials,
            },
            account,
            persistJoinedSeat,
            markGameStart: onGameStartTransition,
            navigate: (href) => router.push(href),
          });
          return;
        }
        if (cancellation.released) {
          activeSearchMutationRef.current = null;
          setActiveActionId(null);
          advanceSearchGeneration(searchGenerationRef);
          setSearchState(null);
          setSearchElapsedSeconds(0);
          setError(err?.message || "Matchmaking failed.");
          return;
        }
        setError(
          "Still checking whether your online request finished. Try Cancel again."
        );
        return;
      }
      setActiveActionId(null);
      advanceSearchGeneration(searchGenerationRef);
      setSearchState(null);
      setSearchElapsedSeconds(0);
      setError(err?.message || "Matchmaking failed.");
    } finally {
      if (isSearchGenerationCurrent({ searchGenerationRef, generation })) {
        setActiveActionId(null);
      }
    }
  }, [
    ensureAccountSession,
    cancelPublicSearchRequest,
    onGameStartTransition,
    persistJoinedSeat,
    requestAnnouncement,
    request,
    commitGameStartNavigation,
    setError,
    setActiveActionId,
    router
  ]);

  const cancelSearch = useCallback(async () => {
    if (!mountedRef.current) return false;
    if (
      !beginSearchCancellation({
        searchCancelPendingRef,
        onPendingChange: (pending) => {
          if (mountedRef.current) setIsSearchCancelPending(pending);
        },
        clearActiveAction: () => setActiveActionId(null),
      })
    ) {
      return false;
    }

    const cancellationGeneration = advanceSearchGeneration(searchGenerationRef);
    try {
      const mutationAtCancellation = activeSearchMutationRef.current;
      clearScheduledMatchAnnouncement({ announcementTimerRef });
      if (
        !isSearchGenerationCurrent({
          searchGenerationRef,
          generation: cancellationGeneration
        })
      ) {
        return false;
      }

      const mutation = activeSearchMutationRef.current ?? mutationAtCancellation;
      if (!mutation) {
        setSearchState(null);
        setSearchElapsedSeconds(0);
        return true;
      }

      let cancellation;
      try {
        cancellation = await cancelPublicSearchRequest(mutation);
      } catch {
        cancellation = { released: false, reason: "uncertain", matchFound: null };
      }

      if (!mountedRef.current || !isSearchGenerationCurrent({
        searchGenerationRef,
        generation: cancellationGeneration
      })) {
        return false;
      }

      if (cancellation.reason === "match_found") {
        const { matchID, playerID, credentials } = cancellation.matchFound;
        activeSearchMutationRef.current = null;
        setError("");
        setSearchState((current) =>
          current ? { ...current, matchID, playerID, phase: "matchFound" } : current
        );
        tabAttention.request("match-found");
        commitGameStartNavigation({
          created: {
            matchID,
            playerID,
            playerCredentials: credentials,
          },
          account: currentAccount,
          persistJoinedSeat,
          markGameStart: onGameStartTransition,
          navigate: (href) => router.push(href),
        });
        return false;
      }

      if (!cancellation.released) {
        setError(
          "Could not confirm that your public search was cancelled. Try Cancel again."
        );
        setSearchState((current) => (current ? { ...current } : current));
        return false;
      }

      activeSearchMutationRef.current = null;
      const activeMatch = readLastActiveMatch(window.localStorage);
      if (
        activeMatch?.matchID === mutation.matchID &&
        activeMatch?.playerID === String(mutation.playerID)
      ) {
        clearLastActiveMatch(window.localStorage);
      }

      setSearchState(null);
      setSearchElapsedSeconds(0);
      return true;
    } finally {
      // Only this generation owns its pending indicator. A new search or
      // successful sign-out releases the old operation independently.
      if (mountedRef.current && isSearchGenerationCurrent({
        searchGenerationRef,
        generation: cancellationGeneration
      })) {
        searchCancelPendingRef.current = false;
        setIsSearchCancelPending(false);
      }
    }
  }, [
    currentAccount,
    cancelPublicSearchRequest,
    onGameStartTransition,
    persistJoinedSeat,
    commitGameStartNavigation,
    setError,
    setActiveActionId,
    router,
  ]);

  const resetSearchAfterSignOut = useCallback(() => {
    advanceSearchGeneration(searchGenerationRef);
    activeSearchMutationRef.current = null;
    searchCancelPendingRef.current = false;
    setIsSearchCancelPending(false);
    setSearchElapsedSeconds(0);
    setActiveActionId((current) => current === "queue" ? null : current);
    clearScheduledMatchAnnouncement({ announcementTimerRef });
    setSearchState(null);
  }, [setActiveActionId]);

  return {
    searchState,
    searchElapsedSeconds,
    isSearchCancelPending,
    play,
    cancelSearch,
    resetSearchAfterSignOut
  };
}
