import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../../lib/server/accounts/getSessionAccount.js";
import {
  isFriendChallengeMatch,
  resolveFriendChallengeState,
} from "../../../../../lib/server/matches/friendChallenge.js";
import { getLiveMatch } from "../../../../../lib/server/matches/getLiveMatch.js";
import { leaveMatchForAccount } from "../../../../../lib/server/matches/leaveMatchForAccount.js";

const unauthorizedResponse = () =>
  NextResponse.json({ error: "You must create or restore an account first." }, { status: 401 });

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to cancel challenge" },
    { status: error?.status ?? 500 }
  );

const safeJson = async (request) => {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
};

export const createChallengeCancelRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    getLiveMatch: getLiveMatchImpl = getLiveMatch,
    leaveMatchForAccount: leaveMatchForAccountImpl = leaveMatchForAccount,
    now = () => new Date(),
  } = {}) =>
  async (request, { params } = {}) => {
    try {
      const sessionAccount = await getSessionAccountImpl({
        cookieHeader: request.headers.get("cookie") ?? "",
      });

      if (!sessionAccount?.account) {
        return unauthorizedResponse();
      }

      const matchID = params?.matchID;
      const payload = await safeJson(request);
      const liveMatch = await getLiveMatchImpl({ matchID });

      if (!isFriendChallengeMatch(liveMatch)) {
        return NextResponse.json({ matchID, canceled: true, status: "expired" });
      }

      const challengeState = resolveFriendChallengeState(liveMatch, { now: now() });

      if (challengeState.inviterAccountId !== sessionAccount.account.id) {
        return NextResponse.json(
          { error: "Only the inviter can cancel this challenge." },
          { status: 403 }
        );
      }

      if (challengeState.status !== "pending") {
        return NextResponse.json({ matchID, canceled: true, status: "expired" });
      }

      if (!payload?.credentials) {
        return NextResponse.json({ error: "credentials are required" }, { status: 400 });
      }

      await leaveMatchForAccountImpl({
        account: sessionAccount.account,
        matchID,
        playerID: challengeState.inviterSeatId,
        credentials: payload.credentials,
      });

      return NextResponse.json({
        matchID,
        playerID: challengeState.inviterSeatId,
        canceled: true,
      });
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createChallengeCancelRoute();
