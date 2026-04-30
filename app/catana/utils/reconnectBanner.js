import {
  clearLastActiveMatch,
  getCredentialsStorageKey,
  readLastActiveMatch
} from "./activeMatchStorage";
import { getLobbyServerOrigin } from "./serverOrigins";

const readPlayers = (match) => {
  if (Array.isArray(match?.players)) return match.players;
  if (match?.players && typeof match.players === "object") {
    return Object.values(match.players);
  }
  return null;
};

const readSetupData = (match) => match?.metadata?.setupData ?? match?.setupData ?? null;

const isOccupiedSeat = (player) =>
  Boolean(player?.name || player?.data?.usernameSnapshot);

const isPendingFriendChallengeMatch = (match, players) => {
  if (readSetupData(match)?.matchKind !== "friend_challenge") {
    return false;
  }

  return players.some((player) => player?.id != null && !isOccupiedSeat(player));
};

export const isSameMatchPath = (pathname, matchID) =>
  pathname === `/g/${matchID}`;

export async function resolveReconnectBannerCandidate({
  pathname,
  storage,
  fetchImpl = fetch,
  lobbyBaseUrl = getLobbyServerOrigin()
}) {
  const activeMatch = readLastActiveMatch(storage);
  if (!activeMatch) return null;
  if (isSameMatchPath(pathname, activeMatch.matchID)) return null;

  const credentialsKey = getCredentialsStorageKey(activeMatch);
  if (!storage?.getItem?.(credentialsKey)) {
    clearLastActiveMatch(storage);
    return null;
  }

  let response;
  try {
    response = await fetchImpl(
      `${lobbyBaseUrl}/games/catan/${activeMatch.matchID}`,
      { cache: "no-store" }
    );
  } catch (err) {
    return null;
  }

  if (!response?.ok) {
    if (response?.status === 404) {
      clearLastActiveMatch(storage);
    }
    return null;
  }

  let match;
  try {
    match = await response.json();
  } catch (err) {
    return null;
  }

  const players = readPlayers(match);
  if (!Array.isArray(players)) {
    clearLastActiveMatch(storage);
    return null;
  }

  const savedSeatStillExists = players.some(
    (player) => String(player?.id) === activeMatch.playerID
  );
  if (!savedSeatStillExists) {
    clearLastActiveMatch(storage);
    return null;
  }

  if (isPendingFriendChallengeMatch(match, players)) {
    return null;
  }

  return {
    matchID: activeMatch.matchID,
    playerID: activeMatch.playerID,
    playerName: activeMatch.playerName,
    href: `/g/${activeMatch.matchID}?playerID=${encodeURIComponent(
      activeMatch.playerID
    )}`
  };
}
