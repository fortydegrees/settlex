import {
  clearLastActiveMatch,
  getCredentialsStorageKey,
  readLastActiveMatch,
} from "./activeMatchStorage";

export const PENDING_FRIEND_CHALLENGE_STORAGE_KEY =
  "catana:lobby:pending-friend-challenge";

const getDefaultStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;

const normalizeRecord = (value) => {
  if (!value || typeof value !== "object") return null;
  if (!value.matchID || value.playerID == null) return null;

  const savedAtMs = Number(value.savedAtMs);

  return {
    matchID: String(value.matchID),
    playerID: String(value.playerID),
    savedAtMs: Number.isFinite(savedAtMs) ? savedAtMs : Date.now()
  };
};

const safeJson = async (response) => {
  try {
    return await response?.json?.();
  } catch (error) {
    return null;
  }
};

const postChallengeCancel = async ({ fetchImpl, matchID, credentials }) => {
  if (!credentials) {
    return { ok: false };
  }

  try {
    const response = await fetchImpl(`/api/challenges/${matchID}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentials })
    });
    if (!response?.ok) return { ok: false };
    const result = await safeJson(response);
    return { ok: true, status: result?.status ?? null };
  } catch (error) {
    /* ignore cleanup failures */
    return { ok: false };
  }
};

const restoreAcceptedChallenge = (storage, record) => {
  clearChallengeResumePointer(storage, record);
  return {
    status: "accepted",
    href: `/g/${record.matchID}`
  };
};

const clearChallengeResumePointer = (storage, record) => {
  const currentChallenge = readPendingFriendChallenge(storage);
  if (
    currentChallenge?.matchID === record.matchID &&
    currentChallenge?.playerID === record.playerID
  ) {
    clearPendingFriendChallenge(storage);
  }
};

const clearChallengeResumeState = (storage, record) => {
  clearChallengeResumePointer(storage, record);

  try {
    storage?.removeItem?.(
      getCredentialsStorageKey({
        matchID: record.matchID,
        playerID: record.playerID
      })
    );
  } catch (error) {
    /* ignore storage failures */
  }

  const activeMatch = readLastActiveMatch(storage);
  if (
    activeMatch?.matchID === record.matchID &&
    activeMatch?.playerID === record.playerID
  ) {
    clearLastActiveMatch(storage);
  }
};

const cancelPendingChallenge = async ({
  storage,
  record,
  fetchImpl,
  credentials,
}) => {
  const cancellation = await postChallengeCancel({
    fetchImpl,
    matchID: record.matchID,
    credentials
  });

  if (cancellation.status === "accepted") {
    return restoreAcceptedChallenge(storage, record);
  }
  if (cancellation.ok) {
    clearChallengeResumeState(storage, record);
    return { status: "canceled" };
  }
  return { status: "cancel-failed" };
};

export function readPendingFriendChallenge(storage = getDefaultStorage()) {
  try {
    const raw = storage?.getItem?.(PENDING_FRIEND_CHALLENGE_STORAGE_KEY);
    if (!raw) return null;
    return normalizeRecord(JSON.parse(raw));
  } catch (error) {
    return null;
  }
}

export function writePendingFriendChallenge(
  storage = getDefaultStorage(),
  record
) {
  const normalized = normalizeRecord(record);
  if (!normalized) return;

  try {
    storage?.setItem?.(
      PENDING_FRIEND_CHALLENGE_STORAGE_KEY,
      JSON.stringify(normalized)
    );
  } catch (error) {
    /* ignore storage failures */
  }
}

export function clearPendingFriendChallenge(storage = getDefaultStorage()) {
  try {
    storage?.removeItem?.(PENDING_FRIEND_CHALLENGE_STORAGE_KEY);
  } catch (error) {
    /* ignore storage failures */
  }
}

export async function restorePendingFriendChallenge({
  storage = getDefaultStorage(),
  fetchImpl = fetch,
  cancelPending = false,
} = {}) {
  const record = readPendingFriendChallenge(storage);
  if (!record) return null;

  const credentials = storage?.getItem?.(
    getCredentialsStorageKey({
      matchID: record.matchID,
      playerID: record.playerID
    })
  );

  let challenge;
  try {
    const response = await fetchImpl(
      `/api/challenges/${record.matchID}`,
      undefined
    );
    if (!response?.ok) {
      return cancelPending
        ? cancelPendingChallenge({ storage, record, fetchImpl, credentials })
        : null;
    }
    challenge = await safeJson(response);
  } catch (error) {
    return cancelPending
      ? cancelPendingChallenge({ storage, record, fetchImpl, credentials })
      : null;
  }

  if (challenge?.status === "pending") {
    if (!cancelPending) {
      return {
        status: "pending",
        challengeState: {
          matchID: record.matchID,
          playerID: record.playerID,
          challengeUrl: `/g/${record.matchID}`,
          expiresAt: challenge?.expiresAt ?? null,
          playerCredentials: credentials ?? null,
          phase: "waiting"
        }
      };
    }

    return cancelPendingChallenge({
      storage,
      record,
      fetchImpl,
      credentials,
    });
  }

  if (challenge?.status === "accepted") {
    return restoreAcceptedChallenge(storage, record);
  }

  const cancellation = await cancelPendingChallenge({
    storage,
    record,
    fetchImpl,
    credentials,
  });
  return cancellation.status === "canceled" ? null : cancellation;
}
