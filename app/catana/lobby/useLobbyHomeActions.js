"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/client/authClient";
import { useMatchAlerts } from "../matchAlerts/useMatchAlerts.js";
import {
  advanceSearchGeneration,
  beginSearchCancellation,
  clearScheduledMatchAnnouncement,
  createMatchmakingMutationIdentity,
  finishSearchPoll,
  getSearchElapsedSeconds,
  isSearchGenerationCurrent,
  playPufferAfterLeavingSearch,
  resolvePublicMatchmakingCancellation,
  resolvePublicMatchmakingSeat,
  scheduleMatchAnnouncement,
} from "../matchmaking/matchmakingRescue.js";
import {
  buildCancelPublicMatchmakingRequest,
  buildStartPublicMatchmakingRequest,
} from "../matchmaking/publicMatchmakingClient.js";
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
  throw Object.assign(new Error(message), {
    status: res.status,
    code: details?.code
  });
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

export function commitGameStartNavigation({
  created,
  account,
  persistJoinedSeat,
  markGameStart,
  navigate,
} = {}) {
  const matchID = created?.matchID;
  if (!matchID) throw new Error("Create succeeded but returned no matchID.");
  if (!created?.playerCredentials) {
    throw new Error("Create succeeded but returned no credentials.");
  }

  const playerID = String(created?.playerID ?? "0");
  persistJoinedSeat({
    matchID,
    playerID,
    credentials: created.playerCredentials,
    playerName: account?.currentUsername,
  });

  try {
    markGameStart?.(matchID);
  } catch (err) {
    /* The board-ready audio marker must never block navigation. */
  }

  navigate(`/g/${matchID}`);
  return matchID;
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
  onGameStartTransition = null
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
  const [activeActionId, setActiveActionId] = useState(null);
  const [authOptions, setAuthOptions] = useState(DEFAULT_AUTH_OPTIONS);
  const [accountReady, setAccountReady] = useState(false);
  const [searchElapsedSeconds, setSearchElapsedSeconds] = useState(0);
  const [isPufferTransitionPending, setIsPufferTransitionPending] = useState(false);
  const [isSearchCancelPending, setIsSearchCancelPending] = useState(false);

  const pendingActionRef = useRef(null);
  const pendingEntryActionRef = useRef(null);
  const announcementTimerRef = useRef(null);
  const announcedMatchIDRef = useRef(null);
  const searchGenerationRef = useRef(0);
  const activeSearchMutationRef = useRef(null);
  const searchCancelPendingRef = useRef(false);
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
        router.push(
          restored.challengeState?.challengeUrl ??
            `/g/${restored.challengeState?.matchID}`
        );
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
  }, [onGameStartTransition, router, searchState]);

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

  const cancelPublicSearchRequest = useCallback(async (mutation) => {
    const response = await appRequest(
      buildCancelPublicMatchmakingRequest({
        modeId: mutation.modeId,
        requestId: mutation.requestId,
        requestedCredentials: mutation.credentials,
      })
    );
    return resolvePublicMatchmakingCancellation(response);
  }, []);

  const play = useCallback(async () => {
    const startedAt = Date.now();
    const generation = advanceSearchGeneration(searchGenerationRef);
    let mutation = null;
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
      const account = await ensureAccountSession();
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
      const created = await appRequest(
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
          "Still checking whether your online request finished. Try Cancel again before starting Puffer."
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
    router
  ]);

  const createFriendChallenge = useCallback(async () => {
    setError("");
    setActiveActionId("friend");

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

      router.push(`/g/${created.matchID}`);
    } catch (err) {
      setError(err?.message || "Failed to create challenge.");
    } finally {
      setActiveActionId(null);
    }
  }, [ensureAccountSession, persistJoinedSeat, router]);

  const playAgainstBot = useCallback(async (botKey = "puffer") => {
    const isSettleGraphV2 = botKey === "settlegraph-v2";
    setError("");
    setActiveActionId(isSettleGraphV2 ? "bot-v2" : "bot");

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
          body: JSON.stringify({ modeId: "duel", opponentType: "bot", botKey })
        }
      });

      commitGameStartNavigation({
        created,
        account,
        persistJoinedSeat,
        markGameStart: onGameStartTransition,
        navigate: (href) => router.push(href),
      });
    } catch (err) {
      setError(err?.message || "Failed to start bot match.");
    } finally {
      setActiveActionId(null);
    }
  }, [ensureGeneratedGuestAccount, onGameStartTransition, persistJoinedSeat, router]);

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

    try {
      const mutationAtCancellation = activeSearchMutationRef.current;
      const cancellationGeneration = advanceSearchGeneration(searchGenerationRef);
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
          "Could not confirm that your public search was cancelled. Try Cancel again before starting Puffer."
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
      searchCancelPendingRef.current = false;
      if (mountedRef.current) setIsSearchCancelPending(false);
    }
  }, [
    currentAccount,
    cancelPublicSearchRequest,
    onGameStartTransition,
    persistJoinedSeat,
    router,
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
    isBusy: Boolean(
      searchState ||
        challengeState ||
        isPufferTransitionPending ||
        activeActionId
    ),
    activeActionId,
    showIdentity,
    entryModal,
    searchState,
    searchElapsedSeconds,
    isPufferTransitionPending,
    isSearchCancelPending,
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
