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

export const createPostgameReplayPayloadState = ({
  identityKey,
  status,
  payload = null,
  error = null,
}) => ({ identityKey, status, payload, error });

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
  identityKey,
  enabled,
  initialPayload = null,
}) {
  const [request, setRequest] = useState(() =>
    createPostgameReplayPayloadState({
      identityKey,
      status: initialPayload ? "ready" : "idle",
      payload: initialPayload,
    })
  );
  const [retryCounter, setRetryCounter] = useState(0);

  useEffect(() => {
    if (initialPayload) {
      setRequest(
        createPostgameReplayPayloadState({
          identityKey,
          status: "ready",
          payload: initialPayload,
        })
      );
      return undefined;
    }
    if (!enabled) {
      setRequest(
        createPostgameReplayPayloadState({ identityKey, status: "idle" })
      );
      return undefined;
    }

    setRequest(
      createPostgameReplayPayloadState({ identityKey, status: "loading" })
    );
    return startPostgameReplayRequest({
      matchID,
      onReady: (payload) =>
        setRequest(
          createPostgameReplayPayloadState({
            identityKey,
            status: "ready",
            payload,
          })
        ),
      onError: (error) =>
        setRequest(
          createPostgameReplayPayloadState({
            identityKey,
            status: "error",
            error,
          })
        ),
    });
  }, [enabled, identityKey, initialPayload, matchID, retryCounter]);

  const retry = useCallback(() => {
    setRetryCounter((count) => count + 1);
  }, []);

  return { ...request, retry };
}
