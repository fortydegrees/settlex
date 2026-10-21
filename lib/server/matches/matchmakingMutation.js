import { randomBytes } from "node:crypto";

import { isBotMatch } from "./botMatch.js";
import { getMatchSetupData, isFriendChallengeMatch } from "./friendChallenge.js";
import {
  GAME_NAME,
  assertOk,
  getGameServerBaseUrl,
} from "./joinMatchForAccount.js";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export function normalizeMatchmakingMutationToken(value) {
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) return null;
  return value;
}

export function readOptionalMatchmakingMutationToken(value, fieldName) {
  if (value == null) return undefined;
  const normalized = normalizeMatchmakingMutationToken(value);
  if (normalized) return normalized;
  const error = new Error(`${fieldName} is invalid`);
  error.status = 400;
  throw error;
}

export function generateMatchPlayerCredentials({
  context,
  fallback = () => randomBytes(24).toString("base64url"),
} = {}) {
  return (
    normalizeMatchmakingMutationToken(
      context?.request?.body?.requestedCredentials
    ) ?? fallback()
  );
}

const playersOf = (match) =>
  (Array.isArray(match?.players)
    ? match.players
    : Object.values(match?.players ?? {}))
    .filter(Boolean);

export async function findMatchmakingMutationSeats({
  fetchImpl = fetch,
  baseUrl,
  accountId,
  requestId,
} = {}) {
  const normalizedRequestId = normalizeMatchmakingMutationToken(requestId);
  if (!accountId || !normalizedRequestId) return [];

  const response = await fetchImpl(
    `${getGameServerBaseUrl(baseUrl)}/games/${GAME_NAME}`,
    { method: "GET" }
  ).then(assertOk);
  const matches = Array.isArray(response?.matches) ? response.matches : [];
  const seats = [];
  for (const match of matches) {
    if (
      isFriendChallengeMatch(match) ||
      isBotMatch(match) ||
      getMatchSetupData(match)?.modeId !== "duel"
    ) {
      continue;
    }
    for (const player of playersOf(match)) {
      if (
        player?.data?.participantType === "human" &&
        player?.data?.accountId === accountId &&
        player?.data?.matchmakingRequestId === normalizedRequestId
      ) {
        seats.push({
          matchID: match.matchID,
          playerID: String(player.id),
        });
      }
    }
  }
  return seats;
}
