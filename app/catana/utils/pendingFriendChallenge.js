import { getCredentialsStorageKey } from "./activeMatchStorage";

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
    return;
  }

  try {
    await fetchImpl(`/api/challenges/${matchID}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentials })
    });
  } catch (error) {
    /* ignore cleanup failures */
  }
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
  fetchImpl = fetch
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
      return null;
    }
    challenge = await safeJson(response);
  } catch (error) {
    return null;
  }

  if (challenge?.status === "pending") {
    return {
      status: "pending",
      challengeState: {
        matchID: record.matchID,
        playerID: record.playerID,
        challengeUrl: `/challenge/${record.matchID}`,
        expiresAt: challenge?.expiresAt ?? null,
        playerCredentials: credentials ?? null,
        phase: "waiting"
      }
    };
  }

  clearPendingFriendChallenge(storage);

  if (challenge?.status === "accepted") {
    return {
      status: "accepted",
      href: `/g/${record.matchID}`
    };
  }

  await postChallengeCancel({
    fetchImpl,
    matchID: record.matchID,
    credentials
  });

  return null;
}
