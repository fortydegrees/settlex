import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../../lib/server/accounts/getSessionAccount.js";
import {
  getFriendChallengeData,
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

const findPlayerBySeatId = (match, seatId) => {
  const players = Array.isArray(match?.players)
    ? match.players
    : Object.values(match?.players ?? {});
  return players.find((player) => String(player?.id) === String(seatId)) ?? null;
};

const isSeatOccupied = (player = {}) =>
  Boolean(player?.name || player?.data?.usernameSnapshot);

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

      const friendChallenge = getFriendChallengeData(liveMatch);
      const challengeState = resolveFriendChallengeState(liveMatch, { now: now() });
      const inviterAccountId = friendChallenge?.inviterAccountId ?? null;
      const inviterSeatId = String(friendChallenge?.inviterSeatId ?? "");

      if (inviterAccountId !== sessionAccount.account.id) {
        return NextResponse.json(
          { error: "Only the inviter can cancel this challenge." },
          { status: 403 }
        );
      }

      if (!payload?.credentials) {
        return NextResponse.json({ error: "credentials are required" }, { status: 400 });
      }

      if (challengeState.status === "accepted") {
        return NextResponse.json({ matchID, canceled: true, status: "expired" });
      }

      const inviterPlayer = findPlayerBySeatId(liveMatch, inviterSeatId);
      if (!isSeatOccupied(inviterPlayer)) {
        return NextResponse.json({ matchID, canceled: true, status: "expired" });
      }

      await leaveMatchForAccountImpl({
        account: sessionAccount.account,
        matchID,
        playerID: inviterSeatId,
        credentials: payload.credentials,
      });

      return NextResponse.json({
        matchID,
        playerID: inviterSeatId,
        canceled: true,
      });
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createChallengeCancelRoute();
