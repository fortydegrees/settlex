import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../../lib/server/accounts/getSessionAccount.js";
import {
  reserveAlertsBeforeHumanJoin,
  restoreAlertsAfterFailedHumanJoin,
} from "../../../../../lib/server/matchAlerts/humanMatchAlertPause.js";
import {
  FRIEND_CHALLENGE_EXPIRED_MESSAGE,
  resolveFriendChallengeState,
} from "../../../../../lib/server/matches/friendChallenge.js";
import { getLiveMatch } from "../../../../../lib/server/matches/getLiveMatch.js";
import { joinMatchForAccount } from "../../../../../lib/server/matches/joinMatchForAccount.js";
import { writeMatchCredentialCookie } from "../../../../../lib/server/session/matchCredentialCookie.js";

const unauthorizedResponse = () =>
  NextResponse.json({ error: "You must create or restore an account first." }, { status: 401 });

const expiredResponse = (matchID) =>
  NextResponse.json(
    { status: "expired", matchID, error: FRIEND_CHALLENGE_EXPIRED_MESSAGE },
    { status: 410 }
  );

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to accept challenge" },
    { status: error?.status ?? 500 }
  );

export const createChallengeAcceptRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    getLiveMatch: getLiveMatchImpl = getLiveMatch,
    joinMatchForAccount: joinMatchForAccountImpl = joinMatchForAccount,
    reserveAlertsBeforeHumanJoin:
      reserveAlertsBeforeHumanJoinImpl = reserveAlertsBeforeHumanJoin,
    restoreAlertsAfterFailedHumanJoin:
      restoreAlertsAfterFailedHumanJoinImpl = restoreAlertsAfterFailedHumanJoin,
    logger = console,
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
      const liveMatch = await getLiveMatchImpl({ matchID });
      const challengeState = resolveFriendChallengeState(liveMatch, { now: now() });

      if (challengeState.status !== "pending") {
        return expiredResponse(matchID);
      }

      if (challengeState.inviterAccountId === sessionAccount.account.id) {
        return NextResponse.json(
          { error: "You cannot accept your own challenge." },
          { status: 403 }
        );
      }

      const reservation = await reserveAlertsBeforeHumanJoinImpl({
        liveMatch,
        joiningAccountId: sessionAccount.account.id,
        joiningPlayerId: challengeState.inviteeSeatId,
        participantType: "human",
        matchID,
      });

      let joined;
      try {
        joined = await joinMatchForAccountImpl({
          account: sessionAccount.account,
          matchID,
          playerID: challengeState.inviteeSeatId,
        });
      } catch (error) {
        if (reservation) {
          try {
            await restoreAlertsAfterFailedHumanJoinImpl({ reservation });
          } catch (restoreError) {
            logger.error("Failed to restore match alerts after rejected friend challenge", {
              matchID,
              accountId: sessionAccount.account.id,
              error: restoreError,
            });
          }
        }
        throw error;
      }

      const response = NextResponse.json({
        matchID,
        playerID: challengeState.inviteeSeatId,
        playerCredentials: joined?.playerCredentials,
      });
      writeMatchCredentialCookie(response, {
        matchID,
        playerID: challengeState.inviteeSeatId,
        credentials: joined?.playerCredentials,
      });
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createChallengeAcceptRoute();
