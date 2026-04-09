import {
  GAME_NAME,
  assertOk,
  getGameServerBaseUrl,
} from "./joinMatchForAccount.js";
import { isFriendChallengeMatch } from "./friendChallenge.js";

const getMatchPlayers = (match = {}) => {
  const rawPlayers = match?.players;
  const players = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers ?? {});
  return players.filter(Boolean).sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
};

const isOccupiedSeat = (player = {}) =>
  Boolean(player?.name || player?.data?.usernameSnapshot);

const isFullMatch = (match = {}) => {
  const players = getMatchPlayers(match);
  return players.length > 0 && players.every(isOccupiedSeat);
};

export const listPublicOpenMatches = async ({
  fetchImpl = fetch,
  baseUrl,
} = {}) => {
  const response = await fetchImpl(`${getGameServerBaseUrl(baseUrl)}/games/${GAME_NAME}`, {
    method: "GET",
  }).then(assertOk);

  const matches = Array.isArray(response?.matches) ? response.matches : [];
  return matches.filter((match) => !isFriendChallengeMatch(match) && !isFullMatch(match));
};
