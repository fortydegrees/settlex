"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/client/authClient";
import { useMatchAlerts } from "../matchAlerts/useMatchAlerts.js";
import {
  advanceSearchGeneration,
  clearScheduledMatchAnnouncement,
  commitSearchSeat,
  createMatchmakingMutationIdentity,
  finishSearchPoll,
  getSearchElapsedSeconds,
  isSearchGenerationCurrent,
  playPufferAfterLeavingSearch,
  reconcileSearchDeparture,
  reconcileUnknownSearchMutation,
  scheduleMatchAnnouncement,
} from "../matchmaking/matchmakingRescue.js";
import { normalizePlayerColorId } from "../theme/playerColors";
import {
  clearLastActiveMatch,
  getCredentialsStorageKey,
  readLastActiveMatch,
  writeLastActiveMatch
} from "../utils/activeMatchStorage";
import {
  clearPendingFriendChallenge,
  restorePendingFriendChallenge,
  writePendingFriendChallenge
} from "../utils/pendingFriendChallenge";
import {
  buildSuggestedGuestIdentity,
  readStoredPlayerIdentity,
  writeStoredPlayerIdentity
} from "./playerIdentityStorage";
import { tabAttention } from "../utils/tabAttention";

const DEFAULT_AUTH_OPTIONS = Object.freeze({
  emailPassword: true,
  socialProviders: []
});
const CLOSED_ENTRY_MODAL = Object.freeze({
  open: false,
  mode: "auth-first",
  intent: "online"
});

const getAccountIdentity = (account) => ({
  name: account?.currentUsername ?? "",
  emoji: account?.avatarEmoji ?? "",
  color: normalizePlayerColorId(account?.avatarColor ?? "")
});

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch (err) {
    return null;
  }
};

const appRequest = async ({ route, init }) => {
  const res = await fetch(route, init);
  if (res.ok) return safeJson(res);

  const details = await safeJson(res);
  const message =
    details?.error || details?.message || `HTTP ${res.status} ${res.statusText}`;
  throw Object.assign(new Error(message), { status: res.status });
};

export async function runAccountSignOutLifecycle({
  detachCurrentBrowser,
  logout,
  completeMatchAlertSignOut,
  refreshMatchAlerts,
  reportDetachWarning = (message, error) => console.warn(message, error),
} = {}) {
  const detachResult = await detachCurrentBrowser({ refreshAfterDetach: false });
  if (!detachResult?.safeToSignOut) {
    throw (
      detachResult?.error ??
      new Error("Failed to detach this browser from your account.")
    );
  }

  if (detachResult.reason === "local_unsubscribe_failed") {
    const message =
      detachResult.error?.message ??
      "The account was detached, but the browser kept its local subscription.";
    reportDetachWarning(message, detachResult.error);
  }

  await logout();
  completeMatchAlertSignOut?.(detachResult);
  await refreshMatchAlerts?.();
}

export async function runAccountEstablishedLifecycle({
  account,
  applyAccountIdentity,
  refreshMatchAlerts,
} = {}) {
  if (!account) return null;
  applyAccountIdentity?.(account);
  await refreshMatchAlerts?.();
  return account;
}

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

export function useLobbyHomeActions({
  initialAccount = null,
  onMatchFound = null
} = {}) {
  const router = useRouter();
  const {
    requestAnnouncement,
    detachCurrentBrowser,
    completeMatchAlertSignOut,
    refresh: refreshMatchAlerts,
  } = useMatchAlerts();
  const initialIdentity = getAccountIdentity(initialAccount);

  const [playerName, setPlayerName] = useState(initialIdentity.name);
  const [playerEmoji, setPlayerEmoji] = useState(initialIdentity.emoji);
  const [playerColor, setPlayerColor] = useState(initialIdentity.color);
  const [currentAccount, setCurrentAccount] = useState(initialAccount);
  const [error, setError] = useState("");
  const [showIdentity, setShowIdentity] = useState(false);
  const [entryModal, setEntryModal] = useState(CLOSED_ENTRY_MODAL);
  const [searchState, setSearchState] = useState(null);
  const [challengeState, setChallengeState] = useState(null);
  const [authOptions, setAuthOptions] = useState(DEFAULT_AUTH_OPTIONS);
  const [accountReady, setAccountReady] = useState(false);
  const [searchElapsedSeconds, setSearchElapsedSeconds] = useState(0);
  const [isPufferTransitionPending, setIsPufferTransitionPending] = useState(false);

  const pendingActionRef = useRef(null);
  const pendingEntryActionRef = useRef(null);
  const announcementTimerRef = useRef(null);
  const announcedMatchIDRef = useRef(null);
  const searchGenerationRef = useRef(0);
  const searchOperationPromiseRef = useRef(null);
  const unresolvedSearchMutationRef = useRef(null);
  const pufferTransitionPendingRef = useRef(false);
  const mountedRef = useRef(true);
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

  const hasIdentity = Boolean(currentAccount?.currentUsername?.trim());

  const applyAccountIdentity = useCallback((account) => {
    if (!account) {
      setCurrentAccount(null);
      return;
    }

    const {
      name: nextName,
      emoji: nextEmoji,
      color: nextColor
    } = getAccountIdentity(account);

    setCurrentAccount(account);
    setPlayerName(nextName);
    setPlayerEmoji(nextEmoji);
    setPlayerColor(nextColor);
    playerNameRef.current = nextName;

    writeStoredPlayerIdentity(window.localStorage, {
      name: nextName,
      emoji: nextEmoji,
      color: nextColor
    });
  }, []);

  const ensureBetterAuthSession = useCallback(async () => {
    const current = await authClient.getSession();
    if (current?.data?.user?.id) {
      return current.data;
    }

    const created = await authClient.signIn.anonymous();
    if (created?.error) {
      throw new Error(created.error.message || "Failed to start guest session.");
    }

    if (!created?.data?.user?.id) {
      throw new Error("Failed to start guest session.");
    }

    return created.data;
  }, []);

  const upsertGuestIdentity = useCallback(
    async ({ name, emoji, color, usernameSource = "custom" }) => {
      await ensureBetterAuthSession();

      const normalizedColor = normalizePlayerColorId(color);
      const response = await appRequest({
        route: "/api/account/guest",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: name,
            usernameSource,
            avatarEmoji: emoji,
            avatarColor: normalizedColor
          })
        }
      });

      if (response?.account) {
        await runAccountEstablishedLifecycle({
          account: response.account,
          applyAccountIdentity,
          refreshMatchAlerts,
        });
      }

      return response?.account ?? null;
    },
    [applyAccountIdentity, ensureBetterAuthSession, refreshMatchAlerts]
  );

  const restoreOrCreateAccount = useCallback(async () => {
    try {
      const current = await appRequest({ route: "/api/account/me" });
      if (current?.account) {
        return runAccountEstablishedLifecycle({
          account: current.account,
          applyAccountIdentity,
          refreshMatchAlerts,
        });
      }
    } catch (err) {
      /* ignore */
    }

    const storedIdentity = readStoredPlayerIdentity(window.localStorage);
    if (!storedIdentity.name) {
      return null;
    }

    try {
      const suggestedIdentity = buildSuggestedGuestIdentity();
      return await upsertGuestIdentity({
        name: storedIdentity.name,
        emoji: storedIdentity.emoji || suggestedIdentity.emoji,
        color: storedIdentity.color || suggestedIdentity.color
      });
    } catch (err) {
      return null;
    }
  }, [applyAccountIdentity, refreshMatchAlerts, upsertGuestIdentity]);

  useEffect(() => {
    let cancelled = false;

    const loadAuthOptions = async () => {
      try {
        const options = await appRequest({ route: "/api/auth/options" });
        if (cancelled) return;

        setAuthOptions({
          emailPassword: options?.emailPassword !== false,
          socialProviders: Array.isArray(options?.socialProviders)
            ? options.socialProviders
            : []
        });
      } catch (err) {
        if (!cancelled) {
          setAuthOptions(DEFAULT_AUTH_OPTIONS);
        }
      }
    };

    void loadAuthOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const createGeneratedGuestAccount = useCallback(async () => {
    const suggestedIdentity = buildSuggestedGuestIdentity();
    return upsertGuestIdentity({
      name: suggestedIdentity.name,
      usernameSource: "generated",
      emoji: suggestedIdentity.emoji,
      color: suggestedIdentity.color
    });
  }, [upsertGuestIdentity]);

  const requireIdentity = useCallback(
    (action) => {
      if (hasIdentity) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setShowIdentity(true);
    },
    [hasIdentity]
  );

  const finishEntryAction = useCallback(() => {
    const action = pendingEntryActionRef.current;
    pendingEntryActionRef.current = null;
    setEntryModal(CLOSED_ENTRY_MODAL);

    if (action) {
      setTimeout(action, 0);
    }
  }, []);

  const closeEntryModal = useCallback(() => {
    pendingEntryActionRef.current = null;
    setEntryModal(CLOSED_ENTRY_MODAL);
  }, []);

  const openSignIn = useCallback(() => {
    pendingEntryActionRef.current = null;
    setEntryModal({
      open: true,
      mode: "auth-first",
      intent: "online"
    });
  }, []);

  const switchEntryToAuth = useCallback(() => {
    setEntryModal((current) => ({
      open: true,
      mode: "auth-first",
      intent: current.intent || "online"
    }));
  }, []);

  const openSaveProfile = useCallback(() => {
    pendingEntryActionRef.current = null;
    setEntryModal({
      open: true,
      mode: "save-profile",
      intent: "online"
    });
  }, []);

  const openPlayUsername = useCallback(({ intent, action }) => {
    pendingEntryActionRef.current = action;
    setEntryModal({
      open: true,
      mode: "play-username",
      intent
    });
  }, []);

  const requirePlayIdentity = useCallback(
    ({ intent, action }) => {
      if (hasIdentity) {
        action();
        return;
      }

      openPlayUsername({ intent, action });
    },
    [hasIdentity, openPlayUsername]
  );

  const handleIdentitySubmit = useCallback(
    async ({ name, emoji, color, usernameSource }) => {
      try {
        await upsertGuestIdentity({ name, emoji, color, usernameSource });
        setShowIdentity(false);
        setError("");
        if (pendingActionRef.current) {
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          setTimeout(action, 0);
        }
      } catch (err) {
        setError(err?.message || "Failed to save account.");
      }
    },
    [upsertGuestIdentity]
  );

  const closeIdentity = useCallback(() => {
    pendingActionRef.current = null;
    setShowIdentity(false);
  }, []);

  const handlePlayUsernameSubmit = useCallback(
    async ({ name, emoji, color, usernameSource }) => {
      try {
        await upsertGuestIdentity({ name, emoji, color, usernameSource });
        setError("");
        finishEntryAction();
      } catch (err) {
        setError(err?.message || "Failed to save account.");
        throw err;
      }
    },
    [finishEntryAction, upsertGuestIdentity]
  );

  const handleAuthEmailSignIn = useCallback(
    async ({ email, password }) => {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result?.error) {
        throw new Error(result.error.message || "Unable to sign in.");
      }

      await restoreOrCreateAccount();
      setError("");
      finishEntryAction();
    },
    [finishEntryAction, restoreOrCreateAccount]
  );

  const handleAuthEmailSignUp = useCallback(
    async ({ email, password }) => {
      const result = await authClient.signUp.email({
        email,
        password,
        name:
          currentAccount?.currentUsername ||
          playerNameRef.current ||
          email.split("@")[0] ||
          "Settlehex player",
      });

      if (result?.error) {
        throw new Error(result.error.message || "Unable to create account.");
      }

      await restoreOrCreateAccount();
      setError("");
      finishEntryAction();
    },
    [currentAccount, finishEntryAction, restoreOrCreateAccount]
  );

  useEffect(() => {
    let cancelled = false;

    const restoreInitialAccount = async () => {
      if (initialAccount?.id) {
        await runAccountEstablishedLifecycle({
          account: initialAccount,
          applyAccountIdentity,
          refreshMatchAlerts,
        });
        if (!cancelled) setAccountReady(true);
        return;
      }

      const storedIdentity = readStoredPlayerIdentity(window.localStorage);
      if (storedIdentity.name) {
        setPlayerName(storedIdentity.name);
        playerNameRef.current = storedIdentity.name;
      }
      if (storedIdentity.emoji) setPlayerEmoji(storedIdentity.emoji);
      if (storedIdentity.color) setPlayerColor(storedIdentity.color);
      await restoreOrCreateAccount();
      if (!cancelled) setAccountReady(true);
    };

    void restoreInitialAccount();

    return () => {
      cancelled = true;
    };
  }, [
    applyAccountIdentity,
    initialAccount,
    refreshMatchAlerts,
    restoreOrCreateAccount,
  ]);

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
    let cancelled = false;

    const restorePendingChallengeState = async () => {
      const restored = await restorePendingFriendChallenge({
        storage: window.localStorage,
        fetchImpl: fetch
      });

      if (cancelled || !restored) {
        return;
      }

      if (restored.status === "pending") {
        setChallengeState((current) => current ?? restored.challengeState);
        return;
      }

      if (restored.status === "accepted") {
        router.push(restored.href);
      }
    };

    void restorePendingChallengeState();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!searchState?.matchID || searchState.playerID == null) return;
    const generation = searchGenerationRef.current;

    const poll = async () => {
      if (unresolvedSearchMutationRef.current) return;
      try {
        const data = await appRequest({
          route: `/api/matches/${searchState.matchID}`
        });
        const match = normalizeMatch(data);
        const allJoined = match.players.every((p) => p.name);
        if (allJoined) {
          finishSearchPoll({
            searchGenerationRef,
            generation,
            onMatchFound: () => {
              clearScheduledMatchAnnouncement({ announcementTimerRef });
              advanceSearchGeneration(searchGenerationRef);
              tabAttention.request("match-found");
              try {
                onMatchFound?.();
              } catch (err) {
                /* Match-found sound is best-effort. */
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
  }, [onMatchFound, router, searchState]);

  useEffect(() => {
    if (!challengeState?.matchID || challengeState.phase !== "waiting") return;

    const poll = async () => {
      try {
        const challenge = await appRequest({
          route: `/api/challenges/${challengeState.matchID}`
        });

        if (challenge?.status === "accepted") {
          clearPendingFriendChallenge(window.localStorage);
          router.push(`/g/${challengeState.matchID}`);
          return;
        }

        if (challenge?.status === "expired") {
          try {
            if (challengeState.playerCredentials) {
              await appRequest({
                route: `/api/challenges/${challengeState.matchID}/cancel`,
                init: {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    credentials: challengeState.playerCredentials
                  })
                }
              });
            }
          } catch (err) {
            /* ignore cleanup errors */
          }

          clearPendingFriendChallenge(window.localStorage);
          const activeMatch = readLastActiveMatch(window.localStorage);
          if (
            activeMatch?.matchID === challengeState.matchID &&
            activeMatch?.playerID === String(challengeState.playerID)
          ) {
            clearLastActiveMatch(window.localStorage);
          }

          setChallengeState((current) =>
            current && current.matchID === challengeState.matchID
              ? { ...current, phase: "expired" }
              : current
          );
        }
      } catch (err) {
        /* keep polling */
      }
    };

    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [challengeState, router]);

  const persistJoinedSeat = useCallback(
    ({ matchID, playerID, credentials, playerName: nextPlayerName }) => {
      if (!credentials) return;

      try {
        window.localStorage.setItem(
          getCredentialsStorageKey({ matchID, playerID }),
          credentials
        );
        writeLastActiveMatch(window.localStorage, {
          matchID,
          playerID: String(playerID),
          playerName:
            nextPlayerName ??
            currentAccount?.currentUsername ??
            playerNameRef.current
        });
      } catch (err) {
        /* ignore */
      }
    },
    [currentAccount]
  );

  const ensureAccountSession = useCallback(async () => {
    if (currentAccount?.id) {
      return currentAccount;
    }

    return restoreOrCreateAccount();
  }, [currentAccount, restoreOrCreateAccount]);

  const ensureGeneratedGuestAccount = useCallback(async () => {
    const account = await ensureAccountSession();
    if (account?.id) {
      return account;
    }

    return createGeneratedGuestAccount();
  }, [createGeneratedGuestAccount, ensureAccountSession]);

  const leaveSearchSeat = useCallback(async ({
    matchID,
    playerID,
    credentials
  }) => {
    if (!matchID || playerID == null || !credentials) return false;

    await appRequest({
      route: "/api/matches/leave",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchID, playerID, credentials })
      }
    });
    return true;
  }, []);

  const recoverMatchmakingSeats = useCallback(async (requestId) => {
    const result = await appRequest({
      route: "/api/matches/recover",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId })
      }
    });
    return result?.seats ?? [];
  }, []);

  const reconcileUnresolvedSearchMutation = useCallback(async () => {
    const mutation = unresolvedSearchMutationRef.current;
    if (!mutation) return { released: true, reason: "none", seats: [] };
    const departure = await reconcileUnknownSearchMutation({
      mutation,
      accountId: mutation.accountId ?? currentAccount?.id,
      recoverSeats: recoverMatchmakingSeats,
      leaveSeat: leaveSearchSeat,
      loadMatch: (matchID) =>
        appRequest({ route: `/api/matches/${matchID}` })
    });
    if (departure.released && unresolvedSearchMutationRef.current === mutation) {
      unresolvedSearchMutationRef.current = null;
    }
    return departure;
  }, [currentAccount?.id, leaveSearchSeat, recoverMatchmakingSeats]);

  const joinRoom = useCallback(
    async ({ matchID, playerID, onError, searchGeneration = null }) => {
      if (!matchID) return;

      let seatRequestStarted = false;
      let account = null;
      let mutation = null;
      setError("");
      try {
        account = await ensureAccountSession();
        if (
          searchGeneration != null &&
          !isSearchGenerationCurrent({
            searchGenerationRef,
            generation: searchGeneration
          })
        ) {
          return true;
        }
        if (!account?.id) {
          throw new Error("Pick a username first.");
        }

        if (searchGeneration != null) {
          mutation = {
            ...createMatchmakingMutationIdentity(),
            accountId: account.id,
            matchID,
            playerID: String(playerID)
          };
          unresolvedSearchMutationRef.current = mutation;
          setSearchState((current) =>
            current
              ? {
                  ...current,
                  matchID,
                  playerID: String(playerID),
                  createdNewPublicDuel: false
                }
              : current
          );
        }

        seatRequestStarted = true;
        const joined = await appRequest({
          route: "/api/matches/join",
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchID,
              playerID: String(playerID),
              ...(mutation
                ? {
                    matchmakingRequestId: mutation.requestId,
                    requestedCredentials: mutation.credentials
                  }
                : {})
            })
          }
        });

        const credentials = joined?.playerCredentials;
        if (!credentials)
          throw new Error("Join succeeded but returned no credentials.");
        if (mutation) mutation.credentials = credentials;

        const seat = {
          matchID,
          playerID: String(playerID),
          credentials
        };
        if (searchGeneration == null) {
          persistJoinedSeat({
            ...seat,
            playerName: account.currentUsername
          });
          router.push(`/g/${matchID}`);
          return true;
        }

        const outcome = await commitSearchSeat({
          searchGenerationRef,
          generation: searchGeneration,
          seat,
          leaveSeat: leaveSearchSeat,
          preserve: () => {
            if (mutation) unresolvedSearchMutationRef.current = mutation;
            persistJoinedSeat({
              ...seat,
              playerName: account.currentUsername
            });
            if (mountedRef.current) {
              setSearchState({
                matchID,
                playerID: String(playerID),
                startedAt: Date.now(),
                phase: "searching",
                createdNewPublicDuel: false
              });
              setError(
                "Could not confirm that you left the public queue. You’re still queued; try Cancel again."
              );
            }
          },
          commit: () => {
            if (unresolvedSearchMutationRef.current === mutation) {
              unresolvedSearchMutationRef.current = null;
            }
            persistJoinedSeat({
              ...seat,
              playerName: account.currentUsername
            });
            router.push(`/g/${matchID}`);
          }
        });
        if (
          outcome.cleaned &&
          unresolvedSearchMutationRef.current === mutation
        ) {
          unresolvedSearchMutationRef.current = null;
        }
        return outcome.committed || outcome.cleaned;
      } catch (err) {
        if (
          searchGeneration != null &&
          !isSearchGenerationCurrent({
            searchGenerationRef,
            generation: searchGeneration
          })
        ) {
          return !seatRequestStarted;
        }
        if (mutation) {
          const departure = await reconcileUnknownSearchMutation({
            mutation,
            accountId: account?.id,
            recoverSeats: recoverMatchmakingSeats,
            leaveSeat: leaveSearchSeat,
            loadMatch: (targetMatchID) =>
              appRequest({ route: `/api/matches/${targetMatchID}` })
          });
          if (departure.released) {
            if (unresolvedSearchMutationRef.current === mutation) {
              unresolvedSearchMutationRef.current = null;
            }
            setError(err?.message || "Failed to join room.");
            onError?.(err);
            return true;
          }
          setError(
            "Still checking whether your online request finished. Try Cancel again before starting Puffer."
          );
          return false;
        }
        setError(err?.message || "Failed to join room.");
        onError?.(err);
        return false;
      }
    },
    [
      ensureAccountSession,
      leaveSearchSeat,
      persistJoinedSeat,
      recoverMatchmakingSeats,
      router
    ]
  );

  const play = useCallback(async () => {
    const startedAt = Date.now();
    const generation = advanceSearchGeneration(searchGenerationRef);
    let settleSearchOperation;
    let operationSafeToTransition = true;
    let mutation = null;
    const searchOperation = new Promise((resolve) => {
      settleSearchOperation = resolve;
    });
    searchOperationPromiseRef.current = searchOperation;
    clearScheduledMatchAnnouncement({ announcementTimerRef });
    announcedMatchIDRef.current = null;
    setSearchElapsedSeconds(0);
    setError("");
    setSearchState({
      matchID: null,
      playerID: null,
      startedAt,
      phase: "searching",
      createdNewPublicDuel: false
    });

    try {
      const data = await appRequest({
        route: "/api/matches/open?modeId=duel"
      });
      if (
        !isSearchGenerationCurrent({ searchGenerationRef, generation })
      ) {
        return;
      }
      const allMatches = (data?.matches || []).map(normalizeMatch);
      const openMatch = allMatches.find(
        (match) =>
          match.players.length === 2 &&
          match.players.some((player) => player.name) &&
          match.players.some((player) => !player.name)
      );

      if (openMatch) {
        setSearchState((current) =>
          current ? { ...current, createdNewPublicDuel: false } : current
        );
        const openSeat = openMatch.players.find((player) => !player.name);
        operationSafeToTransition = await joinRoom({
          matchID: openMatch.matchID,
          playerID: String(openSeat.id),
          onError: () => setSearchState(null),
          searchGeneration: generation
        });
        return;
      }

      const account = await ensureAccountSession();
      if (
        !isSearchGenerationCurrent({ searchGenerationRef, generation })
      ) {
        return;
      }
      if (!account?.id) {
        throw new Error("Pick a username first.");
      }

      operationSafeToTransition = false;
      mutation = {
        ...createMatchmakingMutationIdentity(),
        accountId: account.id,
        matchID: null,
        playerID: "0"
      };
      unresolvedSearchMutationRef.current = mutation;
      const created = await appRequest({
        route: "/api/matches/create",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modeId: "duel",
            matchmakingRequestId: mutation.requestId,
            requestedCredentials: mutation.credentials
          })
        }
      });

      const matchID = created?.matchID;
      if (!matchID) throw new Error("Create succeeded but returned no matchID.");
      if (!created?.playerCredentials) {
        throw new Error("Create succeeded but returned no credentials.");
      }
      mutation.matchID = matchID;
      mutation.credentials = created.playerCredentials;

      const seat = {
        matchID,
        playerID: "0",
        credentials: created.playerCredentials
      };
      const outcome = await commitSearchSeat({
        searchGenerationRef,
        generation,
        seat,
        leaveSeat: leaveSearchSeat,
        preserve: () => {
          unresolvedSearchMutationRef.current = mutation;
          persistJoinedSeat({
            ...seat,
            playerName: account.currentUsername
          });
          if (mountedRef.current) {
            setSearchState({
              matchID,
              playerID: "0",
              startedAt,
              phase: "searching",
              createdNewPublicDuel: true
            });
            setError(
              "Could not confirm that you left the public queue. You’re still queued; try Cancel again."
            );
          }
        },
        commit: () => {
          if (unresolvedSearchMutationRef.current === mutation) {
            unresolvedSearchMutationRef.current = null;
          }
          persistJoinedSeat({
            ...seat,
            playerName: account.currentUsername
          });
          setSearchState({
            matchID,
            playerID: "0",
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
        }
      });
      operationSafeToTransition = outcome.committed || outcome.cleaned;
      if (
        outcome.cleaned &&
        unresolvedSearchMutationRef.current === mutation
      ) {
        unresolvedSearchMutationRef.current = null;
      }
    } catch (err) {
      if (
        !isSearchGenerationCurrent({ searchGenerationRef, generation })
      ) {
        return;
      }
      clearScheduledMatchAnnouncement({ announcementTimerRef });
      if (mutation) {
        const departure = await reconcileUnknownSearchMutation({
          mutation,
          accountId: mutation.accountId,
          recoverSeats: recoverMatchmakingSeats,
          leaveSeat: leaveSearchSeat,
          loadMatch: (matchID) =>
            appRequest({ route: `/api/matches/${matchID}` })
        });
        operationSafeToTransition = departure.released;
        if (departure.released) {
          if (unresolvedSearchMutationRef.current === mutation) {
            unresolvedSearchMutationRef.current = null;
          }
          advanceSearchGeneration(searchGenerationRef);
          setSearchState(null);
          setSearchElapsedSeconds(0);
          setError(err?.message || "Matchmaking failed.");
          return;
        }
        setError(
          "Still checking whether your online request finished. Try Cancel again before starting Puffer."
        );
        return;
      }
      advanceSearchGeneration(searchGenerationRef);
      setSearchState(null);
      setSearchElapsedSeconds(0);
      setError(err?.message || "Matchmaking failed.");
    } finally {
      settleSearchOperation(operationSafeToTransition);
      if (searchOperationPromiseRef.current === searchOperation) {
        searchOperationPromiseRef.current = null;
      }
    }
  }, [
    ensureAccountSession,
    joinRoom,
    leaveSearchSeat,
    persistJoinedSeat,
    recoverMatchmakingSeats,
    requestAnnouncement
  ]);

  const createFriendChallenge = useCallback(async () => {
    setError("");

    try {
      const account = await ensureAccountSession();
      if (!account?.id) {
        throw new Error("Pick a username first.");
      }

      const created = await appRequest({
        route: "/api/challenges/create",
        init: {
          method: "POST"
        }
      });

      if (!created?.matchID) {
        throw new Error("Create succeeded but returned no matchID.");
      }

      if (!created?.playerCredentials) {
        throw new Error("Create succeeded but returned no credentials.");
      }

      persistJoinedSeat({
        matchID: created.matchID,
        playerID: created.playerID,
        credentials: created.playerCredentials,
        playerName: account.currentUsername
      });
      writePendingFriendChallenge(window.localStorage, {
        matchID: created.matchID,
        playerID: created.playerID
      });

      setChallengeState({
        ...created,
        phase: "waiting"
      });
    } catch (err) {
      setError(err?.message || "Failed to create challenge.");
    }
  }, [ensureAccountSession, persistJoinedSeat]);

  const playAgainstBot = useCallback(async () => {
    setError("");

    try {
      const account = await ensureGeneratedGuestAccount();
      if (!account?.id) {
        throw new Error("Pick a username first.");
      }

      const created = await appRequest({
        route: "/api/matches/create",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modeId: "duel", opponentType: "bot" })
        }
      });

      const matchID = created?.matchID;
      if (!matchID) throw new Error("Create succeeded but returned no matchID.");
      if (!created?.playerCredentials) {
        throw new Error("Create succeeded but returned no credentials.");
      }

      persistJoinedSeat({
        matchID,
        playerID: "0",
        credentials: created?.playerCredentials,
        playerName: account.currentUsername
      });

      router.push(`/g/${matchID}`);
    } catch (err) {
      setError(err?.message || "Failed to start bot match.");
    }
  }, [ensureGeneratedGuestAccount, persistJoinedSeat, router]);

  const cancelChallengeInvite = useCallback(async () => {
    if (!challengeState) {
      return;
    }

    try {
      if (challengeState.playerCredentials) {
        await appRequest({
          route: `/api/challenges/${challengeState.matchID}/cancel`,
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              credentials: challengeState.playerCredentials
            })
          }
        });
      }
    } catch (err) {
      /* ignore cleanup errors */
    }

    clearPendingFriendChallenge(window.localStorage);

    const activeMatch = readLastActiveMatch(window.localStorage);
    if (
      activeMatch?.matchID === challengeState.matchID &&
      activeMatch?.playerID === String(challengeState.playerID)
    ) {
      clearLastActiveMatch(window.localStorage);
    }

    setChallengeState(null);
  }, [challengeState]);

  const cancelSearch = useCallback(async () => {
    const pendingSearchOperation = searchOperationPromiseRef.current;
    const cancellationGeneration = advanceSearchGeneration(searchGenerationRef);
    clearScheduledMatchAnnouncement({ announcementTimerRef });
    const safeToTransition = pendingSearchOperation
      ? await pendingSearchOperation
      : true;
    if (
      !isSearchGenerationCurrent({
        searchGenerationRef,
        generation: cancellationGeneration
      })
    ) {
      return false;
    }

    const unresolvedMutation = unresolvedSearchMutationRef.current;
    if (unresolvedMutation) {
      const departure = await reconcileUnresolvedSearchMutation();
      if (
        !isSearchGenerationCurrent({
          searchGenerationRef,
          generation: cancellationGeneration
        })
      ) {
        return false;
      }
      if (!departure.released) {
        setError(
          "Still checking whether your online request finished. Try Cancel again before starting Puffer."
        );
        setSearchState((current) =>
          current ?? {
            matchID: unresolvedMutation.matchID,
            playerID: unresolvedMutation.playerID,
            startedAt: Date.now(),
            phase: "searching",
            createdNewPublicDuel: false
          }
        );
        return false;
      }

      const activeMatch = readLastActiveMatch(window.localStorage);
      if (
        departure.seats.some(
          (seat) =>
            activeMatch?.matchID === seat.matchID &&
            activeMatch?.playerID === String(seat.playerID)
        )
      ) {
        clearLastActiveMatch(window.localStorage);
      }
      setSearchState(null);
      setSearchElapsedSeconds(0);
      return true;
    }

    if (!searchState) {
      return safeToTransition;
    }
    if (!searchState.matchID || searchState.playerID == null) {
      if (!safeToTransition) {
        setError(
          "Could not confirm that you left the public queue. You’re still queued; try Cancel again."
        );
        setSearchState((current) => (current ? { ...current } : current));
        return false;
      }
      setSearchState(null);
      setSearchElapsedSeconds(0);
      return true;
    }

    const credentials = window.localStorage.getItem(
      getCredentialsStorageKey({
        matchID: searchState.matchID,
        playerID: searchState.playerID
      })
    );
    const seat = {
      matchID: searchState.matchID,
      playerID: searchState.playerID,
      credentials
    };
    const departure = await reconcileSearchDeparture({
      seat,
      accountId: currentAccount?.id,
      leaveSeat: leaveSearchSeat,
      loadMatch: (matchID) =>
        appRequest({ route: `/api/matches/${matchID}` })
    });
    if (
      !isSearchGenerationCurrent({
        searchGenerationRef,
        generation: cancellationGeneration
      })
    ) {
      return false;
    }

    if (!departure.released) {
      setError(
        "Could not confirm that you left the public queue. You’re still queued; try Cancel again."
      );
      setSearchState((current) => (current ? { ...current } : current));
      return false;
    }

    const activeMatch = readLastActiveMatch(window.localStorage);
    if (
      activeMatch?.matchID === searchState.matchID &&
      activeMatch?.playerID === String(searchState.playerID)
    ) {
      clearLastActiveMatch(window.localStorage);
    }

    setSearchState(null);
    setSearchElapsedSeconds(0);
    return true;
  }, [
    currentAccount?.id,
    leaveSearchSeat,
    reconcileUnresolvedSearchMutation,
    searchState
  ]);

  const playPufferFromSearch = useCallback(async () => {
    clearScheduledMatchAnnouncement({ announcementTimerRef });
    return playPufferAfterLeavingSearch({
      cancelSearch,
      playAgainstBot,
      pufferTransitionPendingRef,
      onPendingChange: (pending) => {
        if (mountedRef.current) setIsPufferTransitionPending(pending);
      }
    });
  }, [cancelSearch, playAgainstBot]);

  const openIdentity = useCallback(() => {
    pendingActionRef.current = null;
    setShowIdentity(true);
  }, []);

  const signOut = useCallback(async () => {
    setError("");

    try {
      await runAccountSignOutLifecycle({
        detachCurrentBrowser,
        logout: () =>
          appRequest({
            route: "/api/account/logout",
            init: { method: "POST" }
          }),
        completeMatchAlertSignOut,
        refreshMatchAlerts,
      });
    } catch (err) {
      setError(err?.message || "Failed to sign out.");
      return;
    }

    pendingActionRef.current = null;
    writeStoredPlayerIdentity(window.localStorage, {});
    clearPendingFriendChallenge(window.localStorage);
    clearLastActiveMatch(window.localStorage);
    advanceSearchGeneration(searchGenerationRef);
    clearScheduledMatchAnnouncement({ announcementTimerRef });
    setCurrentAccount(null);
    setPlayerName("");
    setPlayerEmoji("");
    setPlayerColor("");
    setShowIdentity(false);
    setEntryModal(CLOSED_ENTRY_MODAL);
    setSearchState(null);
    setChallengeState(null);
    playerNameRef.current = "";
  }, [
    completeMatchAlertSignOut,
    detachCurrentBrowser,
    refreshMatchAlerts,
  ]);

  const signInWithProvider = useCallback(
    async (provider) => {
      setError("");

      const result = await authClient.signIn.social({
        provider,
        callbackURL: window.location.href,
        errorCallbackURL: window.location.href,
        disableRedirect: true
      });

      if (result?.error) {
        setError(result.error.message || "Failed to start sign in.");
        throw new Error(result.error.message || "Failed to start sign in.");
      }

      const redirectUrl = result?.data?.url;
      if (redirectUrl) {
        window.location.assign(redirectUrl);
      }
    },
    []
  );

  const continueAsGuest = useCallback(async () => {
    try {
      await createGeneratedGuestAccount();
      setError("");
      finishEntryAction();
    } catch (err) {
      setError(err?.message || "Failed to start guest session.");
      throw err;
    }
  }, [createGeneratedGuestAccount, finishEntryAction]);

  return {
    account: currentAccount,
    accountReady,
    error,
    hasIdentity,
    identity: {
      name: currentAccount?.currentUsername ?? playerName,
      emoji: currentAccount?.avatarEmoji ?? playerEmoji,
      color: currentAccount?.avatarColor ?? playerColor
    },
    isBusy: Boolean(searchState || challengeState || isPufferTransitionPending),
    showIdentity,
    entryModal,
    searchState,
    searchElapsedSeconds,
    isPufferTransitionPending,
    createdNewPublicDuel: Boolean(searchState?.createdNewPublicDuel),
    playPufferFromSearch,
    challengeState,
    authOptions,
    actions: {
      playOnline: () => requirePlayIdentity({ intent: "online", action: play }),
      playFriend: () => requirePlayIdentity({ intent: "friend", action: createFriendChallenge }),
      playBot: playAgainstBot,
      playPufferFromSearch,
      openIdentity,
      openSignIn,
      switchEntryToAuth,
      openPlayUsername,
      openSaveProfile,
      signInWithProvider,
      goToAccount: () => router.push("/account"),
      continueAsGuest,
      signOut,
      dismissError: () => setError("")
    },
    overlays: {
      handleIdentitySubmit,
      handlePlayUsernameSubmit,
      handleAuthEmailSignIn,
      handleAuthEmailSignUp,
      closeIdentity,
      closeEntryModal,
      cancelSearch,
      cancelChallengeInvite
    }
  };
}
