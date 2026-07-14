"use client";

import { useCallback, useEffect, useState } from "react";

const createAbortError = () => {
  if (typeof DOMException === "function") {
    return new DOMException("The operation was aborted", "AbortError");
  }
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
};

const throwIfAborted = (signal) => {
  if (!signal?.aborted) return;
  throw signal.reason ?? createAbortError();
};

const defaultWait = (delayMs, { signal } = {}) =>
  new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const timeoutId = setTimeout(resolve, delayMs);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        reject(signal.reason ?? createAbortError());
      },
      { once: true }
    );
  });

export const loadPostgameReplayPayload = async ({
  matchID,
  fetchImpl = fetch,
  wait = defaultWait,
  maxAttempts = 10,
  signal,
}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    throwIfAborted(signal);
    const response = await fetchImpl(
      `/api/matches/${encodeURIComponent(matchID)}/replay`,
      { signal }
    );
    throwIfAborted(signal);
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
    await wait(750, { signal });
    throwIfAborted(signal);
  }

  throw new Error("Replay is still preparing");
};

export const startPostgameReplayRequest = ({
  matchID,
  load = loadPostgameReplayPayload,
  onReady,
  onError,
}) => {
  const controller = new AbortController();
  load({ matchID, signal: controller.signal })
    .then((payload) => {
      if (!controller.signal.aborted) onReady(payload);
    })
    .catch((error) => {
      if (controller.signal.aborted || error?.name === "AbortError") return;
      onError(error);
    });
  return () => controller.abort();
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
    if (!enabled) {
      setRequest({ status: "idle", payload: null, error: null });
      return undefined;
    }

    setRequest({ status: "loading", payload: null, error: null });
    return startPostgameReplayRequest({
      matchID,
      onReady: (payload) =>
        setRequest({ status: "ready", payload, error: null }),
      onError: (error) =>
        setRequest({ status: "error", payload: null, error }),
    });
  }, [enabled, initialPayload, matchID, retryCounter]);

  const retry = useCallback(() => {
    setRetryCounter((count) => count + 1);
  }, []);

  return { ...request, retry };
}
