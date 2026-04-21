import { resolveGameMode } from "@settlex/game-core";

export const FRIEND_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const FRIEND_CHALLENGE_EXPIRED_MESSAGE = "This invite has expired.";
const FRIEND_CHALLENGE_MODE = resolveGameMode("duel");

export const buildFriendChallengeSetupData = ({
  inviterAccountId,
  inviterSeatId,
  nowIso,
  expiresAtIso,
} = {}) => ({
  modeId: FRIEND_CHALLENGE_MODE.id,
  rulesetId: FRIEND_CHALLENGE_MODE.rulesetId,
  boardConfigId: FRIEND_CHALLENGE_MODE.boardConfigId,
  matchKind: "friend_challenge",
  friendChallenge: {
    inviterAccountId: inviterAccountId ?? null,
    inviterSeatId: String(inviterSeatId),
    createdAt: nowIso ?? null,
    expiresAt: expiresAtIso ?? null,
  },
});

export const getMatchSetupData = (match = {}) =>
  match?.metadata?.setupData ?? match?.setupData ?? null;

export const getFriendChallengeData = (match = {}) =>
  getMatchSetupData(match)?.friendChallenge ?? null;

export const isFriendChallengeMatch = (match = {}) =>
  getMatchSetupData(match)?.matchKind === "friend_challenge";

const getMatchPlayers = (match = {}) => {
  const rawPlayers = match?.players;
  const players = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers ?? {});
  return players.filter(Boolean).sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
};

const isOccupiedSeat = (player = {}) =>
  Boolean(player?.name || player?.data?.usernameSnapshot);

const toDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const resolveFriendChallengeState = (
  match = {},
  { now = new Date() } = {}
) => {
  if (!isFriendChallengeMatch(match)) {
    return {
      status: "expired",
      matchID: match?.matchID ?? null,
      error: FRIEND_CHALLENGE_EXPIRED_MESSAGE,
    };
  }

  const friendChallenge = getFriendChallengeData(match);
  const inviterSeatId = String(friendChallenge?.inviterSeatId ?? "");
  const inviterAccountId = friendChallenge?.inviterAccountId ?? null;
  const expiresAt = friendChallenge?.expiresAt ?? null;
  const expiresAtDate = toDate(expiresAt);
  const currentTime = now instanceof Date ? now : new Date(now);

  if (!inviterSeatId || !expiresAtDate || currentTime.getTime() >= expiresAtDate.getTime()) {
    return {
      status: "expired",
      matchID: match?.matchID ?? null,
      error: FRIEND_CHALLENGE_EXPIRED_MESSAGE,
    };
  }

  const players = getMatchPlayers(match);
  const occupiedSeatIds = players
    .filter(isOccupiedSeat)
    .map((player) => String(player?.id));
  const openSeatIds = players
    .filter((player) => player?.id != null && !isOccupiedSeat(player))
    .map((player) => String(player.id));

  if (!occupiedSeatIds.includes(inviterSeatId)) {
    return {
      status: "expired",
      matchID: match?.matchID ?? null,
      error: FRIEND_CHALLENGE_EXPIRED_MESSAGE,
    };
  }

  if (openSeatIds.length === 1) {
    return {
      status: "pending",
      matchID: match?.matchID ?? null,
      inviterAccountId,
      inviterSeatId,
      inviteeSeatId: openSeatIds[0],
      expiresAt,
    };
  }

  if (openSeatIds.length === 0) {
    const inviteeSeatId =
      players
        .map((player) => String(player?.id))
        .find((seatId) => seatId && seatId !== inviterSeatId) ?? null;

    return {
      status: "accepted",
      matchID: match?.matchID ?? null,
      inviterAccountId,
      inviterSeatId,
      inviteeSeatId,
      expiresAt,
    };
  }

  return {
    status: "expired",
    matchID: match?.matchID ?? null,
    error: FRIEND_CHALLENGE_EXPIRED_MESSAGE,
  };
};
