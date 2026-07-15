import {
  claimMatchAlertEvent,
  listEligibleMatchAlertSubscriptions,
} from "./matchAlertStore.js";
import { sendMatchAlert } from "./sendMatchAlert.js";
import {
  getMatchSetupData,
  isFriendChallengeMatch,
} from "../matches/friendChallenge.js";
import { getLiveMatch } from "../matches/getLiveMatch.js";
import { isBotMatch } from "../matches/botMatch.js";

const result = (valid, reason, seekerName = null) => ({
  valid,
  reason,
  seekerName,
});

const playersOf = (match) =>
  (Array.isArray(match?.players)
    ? match.players
    : Object.values(match?.players ?? {}))
    .filter(Boolean)
    .sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));

const occupied = (player) =>
  Boolean(player?.name || player?.data?.usernameSnapshot);

const publicNameOf = (player) => {
  const value = player?.name ?? player?.data?.usernameSnapshot;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const gameIsOver = (match) =>
  Boolean(
    match?.gameover ||
      match?.ctx?.gameover ||
      match?.state?.ctx?.gameover ||
      match?.G?.core?.gameOver ||
      match?.state?.G?.core?.gameOver
  );

export function validateWaitingDuel({
  liveMatch,
  matchID,
  seekerAccountId,
} = {}) {
  if (!liveMatch || liveMatch.matchID !== matchID) {
    return result(false, "not_eligible");
  }

  const setupData = getMatchSetupData(liveMatch);
  if (
    setupData?.modeId !== "duel" ||
    setupData?.isPrivate ||
    setupData?.friendChallenge ||
    isFriendChallengeMatch(liveMatch) ||
    isBotMatch(liveMatch)
  ) {
    return result(false, "not_eligible");
  }

  const players = playersOf(liveMatch);
  if (players.length !== 2) return result(false, "not_eligible");

  const occupants = players.filter(occupied);
  if (occupants.length === 0) return result(false, "not_eligible");
  if (occupants.some((player) => player?.data?.participantType !== "human")) {
    return result(false, "not_eligible");
  }

  const seeker = occupants.find(
    (player) => player?.data?.accountId === seekerAccountId
  );
  if (!seeker) return result(false, "not_eligible");

  const seekerName = publicNameOf(seeker);
  if (occupants.length !== 1) return result(false, "filled", seekerName);
  if (gameIsOver(liveMatch)) return result(false, "finished", seekerName);

  return result(true, "waiting", seekerName);
}

export async function announceWaitingDuel({
  matchID,
  seekerAccountId,
  getLiveMatchImpl = getLiveMatch,
  claimMatchAlertEventImpl = claimMatchAlertEvent,
  listEligibleMatchAlertSubscriptionsImpl = listEligibleMatchAlertSubscriptions,
  sendMatchAlertImpl = sendMatchAlert,
} = {}) {
  let liveMatch;
  try {
    liveMatch = await getLiveMatchImpl({ matchID });
  } catch (error) {
    if (error?.status === 404 || error?.status === 410) {
      return { announced: false, reason: "not_eligible" };
    }
    throw error;
  }

  const validation = validateWaitingDuel({
    liveMatch,
    matchID,
    seekerAccountId,
  });
  if (!validation.valid) {
    return { announced: false, reason: validation.reason };
  }

  const claim = await claimMatchAlertEventImpl({ matchID, seekerAccountId });
  if (!claim.claimed) return { announced: false, reason: claim.reason };

  const subscriptions = await listEligibleMatchAlertSubscriptionsImpl({
    excludeAccountId: seekerAccountId,
  });
  const delivery = await sendMatchAlertImpl({
    matchID,
    seekerName: validation.seekerName,
    subscriptions,
  });
  return { announced: true, reason: "announced", delivery };
}
