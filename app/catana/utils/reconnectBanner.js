import {
  clearLastActiveMatch,
  getCredentialsStorageKey,
  readLastActiveMatch
} from "./activeMatchStorage";

const getDefaultLobbyBaseUrl = () => {
  if (typeof window === "undefined") return "http://localhost:8080";
  return `${window.location.protocol}//${window.location.hostname}:8080`;
};

const readPlayers = (match) => {
  if (Array.isArray(match?.players)) return match.players;
  if (match?.players && typeof match.players === "object") {
    return Object.values(match.players);
  }
  return null;
};

export const isSameMatchPath = (pathname, matchID) =>
  pathname === `/catana/lobby/${matchID}`;

export async function resolveReconnectBannerCandidate({
  pathname,
  storage,
  fetchImpl = fetch,
  lobbyBaseUrl = getDefaultLobbyBaseUrl()
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

  return {
    matchID: activeMatch.matchID,
    playerID: activeMatch.playerID,
    playerName: activeMatch.playerName,
    href: `/catana/lobby/${activeMatch.matchID}?playerID=${encodeURIComponent(
      activeMatch.playerID
    )}`
  };
}
