export const FRIEND_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const buildFriendChallengeSetupData = ({
  inviterAccountId,
  inviterSeatId,
  nowIso,
  expiresAtIso,
} = {}) => ({
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

export const isFriendChallengeMatch = (match = {}) =>
  getMatchSetupData(match)?.matchKind === "friend_challenge";
