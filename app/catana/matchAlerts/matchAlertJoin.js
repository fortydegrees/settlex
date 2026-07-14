import {
  clearLastActiveMatch,
  getCredentialsStorageKey,
  readLastActiveMatch,
  writeLastActiveMatch,
} from "../utils/activeMatchStorage.js";

const staleResult = () => ({
  status: "stale",
  match: null,
  seekerName: null,
});

const errorResult = () => ({
  status: "error",
  match: null,
  seekerName: null,
});

const getPlayers = (match) =>
  (Array.isArray(match?.players)
    ? match.players
    : Object.values(match?.players ?? {}))
    .filter(Boolean)
    .sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));

const isOccupied = (player) =>
  Boolean(player?.name || player?.data?.usernameSnapshot);

const getPublicName = (player) => {
  const value = player?.name ?? player?.data?.usernameSnapshot;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const isGameOver = (match) =>
  Boolean(
    match?.gameover ||
      match?.ctx?.gameover ||
      match?.state?.ctx?.gameover ||
      match?.G?.core?.gameOver ||
      match?.state?.G?.core?.gameOver
  );

const isCancelled = (match) => {
  const status = String(match?.status ?? "").toLowerCase();
  return Boolean(
    match?.cancelled ||
      match?.canceled ||
      status === "cancelled" ||
      status === "canceled"
  );
};

const normalizeMatch = (raw) => {
  const players = getPlayers(raw);
  const setupData = raw?.metadata?.setupData ?? raw?.setupData ?? null;
  return {
    ...raw,
    setupData,
    players,
    openSeat: players.find((player) => !isOccupied(player)) ?? null,
  };
};

const isOpenHumanDuel = (match, matchID) => {
  if (!match || String(match.matchID) !== String(matchID)) return false;
  if (match.gameName && match.gameName !== "catan") return false;
  if (isCancelled(match) || isGameOver(match)) return false;

  const setupData = match.setupData;
  if (
    setupData?.modeId !== "duel" ||
    setupData?.isPrivate ||
    setupData?.friendChallenge ||
    setupData?.matchKind === "friend_challenge"
  ) {
    return false;
  }

  if (match.players.length !== 2) return false;
  const occupants = match.players.filter(isOccupied);
  const openSeats = match.players.filter((player) => !isOccupied(player));
  if (occupants.length !== 1 || openSeats.length !== 1) return false;
  return occupants[0]?.data?.participantType === "human";
};

export async function resolveAlertMatch({
  matchID,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!matchID || typeof fetchImpl !== "function") return staleResult();

  try {
    const response = await fetchImpl(
      `/api/matches/${encodeURIComponent(matchID)}`,
      { cache: "no-store" }
    );
    if (response.status === 404 || response.status === 410) {
      return staleResult();
    }
    if (!response.ok) return errorResult();

    const match = normalizeMatch(await response.json());
    if (!isOpenHumanDuel(match, matchID)) return staleResult();

    const seeker = match.players.find(isOccupied);
    return {
      status: "open",
      match,
      seekerName: getPublicName(seeker),
    };
  } catch {
    return errorResult();
  }
}

const joinResult = (status, matchID = null, playerID = null) => ({
  status,
  matchID,
  playerID,
});

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const leaveActiveBotMatch = async ({ currentGame, storage, fetchImpl }) => {
  if (currentGame?.opponentType !== "bot") return true;

  const activeMatch = readLastActiveMatch(storage);
  if (!activeMatch || activeMatch.matchID !== currentGame.matchID) return false;

  const credentialKey = getCredentialsStorageKey(activeMatch);
  let credentials;
  try {
    credentials = storage?.getItem?.(credentialKey);
  } catch {
    return false;
  }
  if (!credentials) return false;

  const response = await fetchImpl("/api/matches/leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      matchID: activeMatch.matchID,
      playerID: activeMatch.playerID,
      credentials,
    }),
  });
  if (!response.ok) return false;

  try {
    storage?.removeItem?.(credentialKey);
  } catch {
    // The server leave already succeeded; stale local credentials are harmless.
  }
  clearLastActiveMatch(storage);
  return true;
};

export async function joinAlertMatch({
  matchID,
  currentGame = null,
  storage = globalThis.window?.localStorage ?? null,
  fetchImpl = globalThis.fetch,
} = {}) {
  try {
    const verified = await resolveAlertMatch({ matchID, fetchImpl });
    if (verified.status === "stale") return joinResult("stale");
    if (verified.status !== "open") return joinResult("error");

    const leftBotMatch = await leaveActiveBotMatch({
      currentGame,
      storage,
      fetchImpl,
    });
    if (!leftBotMatch) return joinResult("error");

    const playerID = String(verified.match.openSeat.id);
    const response = await fetchImpl("/api/matches/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchID: verified.match.matchID,
        playerID,
        participantType: "human",
      }),
    });
    if (
      response.status === 409 ||
      response.status === 404 ||
      response.status === 410
    ) {
      return joinResult("stale");
    }
    if (!response.ok) return joinResult("error");

    const joined = await readJson(response);
    const credentials = joined?.playerCredentials;
    const joinedPlayerID = String(joined?.playerID ?? playerID);
    if (!credentials) return joinResult("error");

    try {
      storage?.setItem?.(
        getCredentialsStorageKey({
          matchID: verified.match.matchID,
          playerID: joinedPlayerID,
        }),
        credentials
      );
      writeLastActiveMatch(storage, {
        matchID: verified.match.matchID,
        playerID: joinedPlayerID,
      });
    } catch {
      // The route also persisted a credential cookie; continue to the match.
    }

    return joinResult("joined", verified.match.matchID, joinedPlayerID);
  } catch {
    return joinResult("error");
  }
}
