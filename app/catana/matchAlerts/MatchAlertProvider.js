"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createLatestRefreshGuard,
  detachMatchAlertBrowser,
  getSignedOutMatchAlertState,
  loadMatchAlertSnapshot,
  requestMatchAnnouncement,
  registerCurrentMatchAlertGame,
  runEnableTransaction,
  runPreferenceAction,
} from "./matchAlertProviderActions.js";
import { MatchAlertDialog } from "./MatchAlertDialog.js";
import { resolveAlertMatch } from "./matchAlertJoin.js";
import { getMatchAlertDisplayState } from "./matchAlertState.js";

const OFF_PREFERENCE = Object.freeze({
  enabled: false,
  state: "off",
  pausedReason: null,
  pausedMatchId: null,
  pausedAt: null,
});

const initialCapability = { supported: false, reason: "unsupported" };

const errorMessage = (error, fallback) => error?.message ?? fallback;

export const MatchAlertContext = createContext(null);

export function MatchAlertProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [capability, setCapability] = useState(initialCapability);
  const [permission, setPermission] = useState(null);
  const [preference, setPreference] = useState(OFF_PREFERENCE);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [enableAttempted, setEnableAttempted] = useState(false);
  const [error, setError] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [alert, setAlert] = useState(null);
  const alertRequestRef = useRef(0);
  const alertJoinPendingRef = useRef(false);
  const refreshGuardRef = useRef(null);
  if (!refreshGuardRef.current) {
    refreshGuardRef.current = createLatestRefreshGuard();
  }

  const refresh = useCallback(async () => {
    const guard = refreshGuardRef.current;
    const request = guard.begin();
    setLoading(true);
    setError(null);

    try {
      const snapshot = await loadMatchAlertSnapshot();
      const committed = guard.commit(request, () => {
        setSignedIn(snapshot.signedIn);
        setConfigured(snapshot.configured);
        setVapidPublicKey(snapshot.vapidPublicKey);
        setPreference(snapshot.preference);
        setCapability(snapshot.capability);
        setPermission(snapshot.permission);
        setHasSubscription(snapshot.hasSubscription);
      });
      return committed ? snapshot : { ...snapshot, stale: true };
    } catch (refreshError) {
      guard.commit(request, () => {
        setError(errorMessage(refreshError, "Failed to load match alerts."));
      });
      return null;
    } finally {
      guard.commit(request, () => setLoading(false));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openMatchAlert = useCallback(async (matchID) => {
    if (!matchID) return;
    if (alertJoinPendingRef.current) return;

    const request = alertRequestRef.current + 1;
    alertRequestRef.current = request;
    setAlert({ status: "checking", matchID, match: null, seekerName: null });

    const result = await resolveAlertMatch({ matchID });
    if (alertRequestRef.current !== request) return;
    setAlert({ ...result, matchID });
  }, []);

  const closeMatchAlert = useCallback(() => {
    alertRequestRef.current += 1;
    setAlert(null);
  }, []);

  const setAlertJoinPending = useCallback((pending) => {
    alertJoinPendingRef.current = Boolean(pending);
  }, []);

  const registerCurrentGame = useCallback(
    (game) =>
      registerCurrentMatchAlertGame({ game, setCurrentGame, refresh }),
    [refresh]
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const matchID = searchParams.get("matchAlert");
    if (matchID) {
      const url = new URL(window.location.href);
      url.searchParams.delete("matchAlert");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
      void openMatchAlert(matchID);
    }

    const handleServiceWorkerMessage = (event) => {
      if (event?.data?.type !== "match-alert-click") return;
      const clickedMatchID = event.data.matchID;
      if (typeof clickedMatchID !== "string" || !clickedMatchID) return;
      void openMatchAlert(clickedMatchID);
    };

    const serviceWorker = window.navigator?.serviceWorker;
    serviceWorker?.addEventListener?.("message", handleServiceWorkerMessage);
    return () => {
      serviceWorker?.removeEventListener?.("message", handleServiceWorkerMessage);
    };
  }, [openMatchAlert]);

  const enable = useCallback(async () => {
    setEnableAttempted(true);
    setError(null);
    setLoading(true);
    try {
      const result = await runEnableTransaction({
        configured,
        publicKey: vapidPublicKey,
        refresh,
        onCapability: (nextCapability) => {
          setCapability(nextCapability);
          setPermission(nextCapability.permission ?? null);
        },
      });
      if (result.reason === "unconfigured") {
        setError("Match alerts are not configured on this server.");
      }
      return result;
    } catch (enableError) {
      setError(errorMessage(enableError, "Failed to enable match alerts."));
      return { enabled: false, reason: "request_failed" };
    } finally {
      setLoading(false);
    }
  }, [configured, refresh, vapidPublicKey]);

  const updatePreference = useCallback(
    async (action) => {
      setLoading(true);
      setError(null);
      try {
        return await runPreferenceAction({ action, refresh });
      } catch (updateError) {
        setError(errorMessage(updateError, "Failed to update match alerts."));
        return { updated: false, reason: "request_failed" };
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  const disable = useCallback(
    () => updatePreference("disable"),
    [updatePreference]
  );
  const resume = useCallback(
    () => updatePreference("resume"),
    [updatePreference]
  );

  const detachCurrentBrowser = useCallback(async ({
    refreshAfterDetach = true,
  } = {}) => {
    setError(null);
    const result = await detachMatchAlertBrowser();
    if (result.error) {
      setError(
        errorMessage(
          result.error,
          result.safeToSignOut
            ? "Your account was detached, but this browser kept its local subscription."
            : "Failed to detach this browser from your account."
        )
      );
    }
    if (result.reason === "detached" && refreshAfterDetach) await refresh();
    return result;
  }, [refresh]);

  const completeMatchAlertSignOut = useCallback((detachResult) => {
    const signedOutState = getSignedOutMatchAlertState(detachResult);
    setSignedIn(signedOutState.signedIn);
    setConfigured(signedOutState.configured);
    setVapidPublicKey(signedOutState.vapidPublicKey);
    setPreference(signedOutState.preference);
    setHasSubscription(signedOutState.hasSubscription);
    setError(null);
  }, []);

  const requestAnnouncement = useCallback(
    (matchID) => requestMatchAnnouncement({ matchID }),
    []
  );

  const display = useMemo(
    () =>
      getMatchAlertDisplayState({
        configured,
        capability,
        permission,
        preference,
        hasSubscription,
        enableAttempted,
        currentGame,
      }),
    [
      capability,
      configured,
      currentGame,
      enableAttempted,
      hasSubscription,
      permission,
      preference,
    ]
  );

  const value = useMemo(
    () => ({
      loading,
      configured,
      capability,
      permission,
      preference,
      hasSubscription,
      signedIn,
      enableAttempted,
      display,
      error,
      refresh,
      enable,
      disable,
      resume,
      detachCurrentBrowser,
      completeMatchAlertSignOut,
      requestAnnouncement,
      registerCurrentGame,
      currentGame,
    }),
    [
      capability,
      completeMatchAlertSignOut,
      configured,
      detachCurrentBrowser,
      disable,
      display,
      enable,
      enableAttempted,
      error,
      hasSubscription,
      loading,
      permission,
      preference,
      refresh,
      requestAnnouncement,
      registerCurrentGame,
      resume,
      signedIn,
      currentGame,
    ]
  );

  return (
    <MatchAlertContext.Provider value={value}>
      {children}
      <MatchAlertDialog
        alert={alert}
        currentGame={currentGame}
        onClose={closeMatchAlert}
        onJoiningChange={setAlertJoinPending}
      />
    </MatchAlertContext.Provider>
  );
}
