import { NextResponse } from "next/server";
import {
  FRIEND_CHALLENGE_EXPIRED_MESSAGE,
  resolveFriendChallengeState,
} from "../../../../lib/server/matches/friendChallenge.js";
import { getLiveMatch } from "../../../../lib/server/matches/getLiveMatch.js";

const expiredPayload = (matchID) => ({
  status: "expired",
  matchID,
  error: FRIEND_CHALLENGE_EXPIRED_MESSAGE,
});

export const createChallengeDetailsRoute =
  ({
    getLiveMatch: getLiveMatchImpl = getLiveMatch,
    now = () => new Date(),
  } = {}) =>
  async (_request, { params } = {}) => {
    const matchID = params?.matchID;
    if (!matchID) {
      return NextResponse.json(expiredPayload(null));
    }

    try {
      const liveMatch = await getLiveMatchImpl({ matchID });
      const state = resolveFriendChallengeState(liveMatch, { now: now() });
      if (state.status === "pending" || state.status === "accepted") {
        return NextResponse.json({
          status: state.status,
          matchID: state.matchID,
          inviterSeatId: state.inviterSeatId,
          inviteeSeatId: state.inviteeSeatId,
          expiresAt: state.expiresAt,
        });
      }

      return NextResponse.json(state);
    } catch (error) {
      return NextResponse.json(expiredPayload(matchID));
    }
  };

export const GET = createChallengeDetailsRoute();
