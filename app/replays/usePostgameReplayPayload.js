"use client";

import { useCallback, useEffect, useState } from "react";

const defaultWait = (delayMs) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

export const loadPostgameReplayPayload = async ({
  matchID,
  fetchImpl = fetch,
  wait = defaultWait,
  maxAttempts = 10,
}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetchImpl(
      `/api/matches/${encodeURIComponent(matchID)}/replay`
    );
    if (response.ok && response.status !== 202) {
      return response.json();
    }
    if (response.status !== 202) {
      const details = await response.json().catch(() => ({}));
      throw new Error(
        details.error ?? `Replay request failed (${response.status})`
      );
    }
    if (attempt === maxAttempts - 1) {
      throw new Error("Replay is still preparing");
    }
    await wait(750);
  }

  throw new Error("Replay is still preparing");
};

export function usePostgameReplayPayload({
  matchID,
  enabled,
  initialPayload = null,
}) {
  const [request, setRequest] = useState(() => ({
    status: initialPayload ? "ready" : "idle",
    payload: initialPayload,
    error: null,
  }));
  const [retryCounter, setRetryCounter] = useState(0);

  useEffect(() => {
    if (initialPayload) {
      setRequest({ status: "ready", payload: initialPayload, error: null });
      return undefined;
    }
    if (!enabled) return undefined;

    let active = true;
    setRequest({ status: "loading", payload: null, error: null });
    loadPostgameReplayPayload({ matchID })
      .then((payload) => {
        if (active) setRequest({ status: "ready", payload, error: null });
      })
      .catch((error) => {
        if (active) setRequest({ status: "error", payload: null, error });
      });

    return () => {
      active = false;
    };
  }, [enabled, initialPayload, matchID, retryCounter]);

  const retry = useCallback(() => {
    setRetryCounter((count) => count + 1);
  }, []);

  return { ...request, retry };
}
