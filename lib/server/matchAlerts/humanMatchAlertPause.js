import { getLiveMatch } from "../matches/getLiveMatch.js";
import {
  pauseMatchAlertsForAccounts,
  reserveMatchAlertsForAccounts,
  restoreMatchAlertsReservation,
} from "./matchAlertStore.js";

const playersOf = (match) =>
  (Array.isArray(match?.players)
    ? match.players
    : Object.values(match?.players ?? {}))
    .filter(Boolean);

const occupied = (player) =>
  Boolean(player?.name || player?.data?.usernameSnapshot);

export function getHumanAccountsAfterJoin({
  liveMatch,
  joiningAccountId,
  joiningPlayerId,
  participantType = "human",
} = {}) {
  if (participantType !== "human" || !joiningAccountId) return [];
  const players = playersOf(liveMatch);
  const target = players.find(
    (player) => String(player?.id) === String(joiningPlayerId)
  );
  if (!target || occupied(target)) return [];

  const otherPlayers = players.filter(
    (player) => String(player?.id) !== String(joiningPlayerId)
  );
  if (otherPlayers.length === 0 || otherPlayers.some((player) => !occupied(player))) {
    return [];
  }
  if (otherPlayers.some((player) => player?.data?.participantType !== "human")) {
    return [];
  }

  const accountIds = otherPlayers
    .map((player) => player?.data?.accountId)
    .filter(Boolean);
  if (accountIds.length !== otherPlayers.length) return [];
  return [...new Set([...accountIds, joiningAccountId])];
}

export async function pauseAlertsAfterHumanJoin({
  liveMatch,
  joiningAccountId,
  joiningPlayerId,
  participantType = "human",
  matchID = liveMatch?.matchID,
  pauseMatchAlerts = pauseMatchAlertsForAccounts,
} = {}) {
  const accountIds = getHumanAccountsAfterJoin({
    liveMatch,
    joiningAccountId,
    joiningPlayerId,
    participantType,
  });
  if (accountIds.length === 0) return [];
  return pauseMatchAlerts({ accountIds, matchID });
}

export async function reserveAlertsBeforeHumanJoin({
  liveMatch,
  joiningAccountId,
  joiningPlayerId,
  participantType = "human",
  matchID = liveMatch?.matchID,
  reserveMatchAlerts = reserveMatchAlertsForAccounts,
} = {}) {
  const accountIds = getHumanAccountsAfterJoin({
    liveMatch,
    joiningAccountId,
    joiningPlayerId,
    participantType,
  });
  if (accountIds.length === 0) return null;
  return reserveMatchAlerts({ accountIds, matchID });
}

export async function restoreAlertsAfterFailedHumanJoin({
  reservation,
  restoreReservation = restoreMatchAlertsReservation,
} = {}) {
  if (!reservation) return [];
  return restoreReservation({ reservation });
}

export async function canResumePausedMatch({
  matchID,
  getLiveMatchImpl = getLiveMatch,
} = {}) {
  if (!matchID) return true;
  try {
    const match = await getLiveMatchImpl({ matchID });
    if (match?.gameover) return true;
    const players = playersOf(match);
    const isFilledHumanGame =
      players.length >= 2 &&
      players.every(
        (player) => occupied(player) && player?.data?.participantType === "human"
      );
    return !isFilledHumanGame;
  } catch (error) {
    if (error?.status === 404 || error?.status === 410) return true;
    throw error;
  }
}
