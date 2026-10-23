"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/client/authClient";
import { useMatchAlerts } from "../matchAlerts/useMatchAlerts.js";
import { usePublicMatchmaking } from "./usePublicMatchmaking";
import { normalizePlayerColorId } from "../../_features/theme/playerColors";
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
} from "../../_features/account/playerIdentityStorage";

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
  const [challengeState, setChallengeState] = useState(null);
  const [activeActionId, setActiveActionId] = useState(null);
  const [authOptions, setAuthOptions] = useState(DEFAULT_AUTH_OPTIONS);
  const [accountReady, setAccountReady] = useState(false);

  const pendingActionRef = useRef(null);
  const pendingEntryActionRef = useRef(null);
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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restorePendingChallengeState = async () => {
      const restored = await restorePendingFriendChallenge({
        storage: window.localStorage,
        fetchImpl: fetch,
        cancelPending: true,
      });

      if (cancelled || !restored) {
        return;
      }

      if (restored.status === "cancel-failed") {
        setError("Couldn't cancel the friend invite. Reload to retry; it may still be active.");
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

  const {
    searchState,
    searchElapsedSeconds,
    isSearchCancelPending,
    play,
    cancelSearch,
    resetSearchAfterSignOut,
  } = usePublicMatchmaking({
    request: appRequest,
    ensureAccountSession,
    currentAccount,
    persistJoinedSeat,
    commitGameStartNavigation,
    requestAnnouncement,
    onGameStartTransition,
    setError,
    setActiveActionId
  });

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

  const playAgainstBot = useCallback(async () => {
    setError("");
    setActiveActionId("bot-v2");

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
          body: JSON.stringify({ modeId: "duel", opponentType: "bot", botKey: "settlegraph-v2" })
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
    resetSearchAfterSignOut();
    setCurrentAccount(null);
    setPlayerName("");
    setPlayerEmoji("");
    setPlayerColor("");
    setShowIdentity(false);
    setEntryModal(CLOSED_ENTRY_MODAL);
    setChallengeState(null);
    playerNameRef.current = "";
  }, [
    completeMatchAlertSignOut,
    detachCurrentBrowser,
    refreshMatchAlerts,
    resetSearchAfterSignOut,
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
        activeActionId
    ),
    activeActionId,
    showIdentity,
    entryModal,
    searchState,
    searchElapsedSeconds,
    isSearchCancelPending,
    createdNewPublicDuel: Boolean(searchState?.createdNewPublicDuel),
    challengeState,
    authOptions,
    actions: {
      playOnline: () => requirePlayIdentity({ intent: "online", action: play }),
      playFriend: () => requirePlayIdentity({ intent: "friend", action: createFriendChallenge }),
      playBot: playAgainstBot,
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
