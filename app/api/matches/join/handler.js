import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import { pauseAlertsAfterHumanJoin } from "../../../../lib/server/matchAlerts/humanMatchAlertPause.js";
import { isFriendChallengeMatch } from "../../../../lib/server/matches/friendChallenge.js";
import { getLiveMatch } from "../../../../lib/server/matches/getLiveMatch.js";
import { joinMatchForAccount } from "../../../../lib/server/matches/joinMatchForAccount.js";
import { writeMatchCredentialCookie } from "../../../../lib/server/session/matchCredentialCookie.js";

const unauthorizedResponse = () =>
  NextResponse.json({ error: "You must create or restore an account first." }, { status: 401 });

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to join match" },
    { status: error?.status ?? 500 }
  );

export const createMatchJoinRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    getLiveMatch: getLiveMatchImpl = getLiveMatch,
    joinMatchForAccount: joinMatchForAccountImpl = joinMatchForAccount,
    pauseAlertsAfterHumanJoin: pauseAlertsAfterHumanJoinImpl = pauseAlertsAfterHumanJoin,
    logger = console,
  } = {}) =>
  async (request) => {
    try {
      const sessionAccount = await getSessionAccountImpl({
        cookieHeader: request.headers.get("cookie") ?? "",
      });

      if (!sessionAccount?.account) {
        return unauthorizedResponse();
      }

      const payload = await request.json();
      const liveMatch = await getLiveMatchImpl({
        matchID: payload?.matchID,
      });

      if (isFriendChallengeMatch(liveMatch)) {
        return NextResponse.json(
          { error: "Private friend challenges must be joined through their challenge link." },
          { status: 403 }
        );
      }

      const result = await joinMatchForAccountImpl({
        account: sessionAccount.account,
        matchID: payload?.matchID,
        playerID: payload?.playerID,
        participant:
          payload?.participantType === "bot"
            ? {
                participantType: "bot",
                botKey: payload?.botKey ?? "puffer",
                usernameSnapshot: payload?.botName ?? "[BOT]",
                avatarSnapshot: {
                  emoji: payload?.avatarEmoji ?? "🤖",
                  color: payload?.avatarColor ?? "sky",
                },
              }
            : undefined,
      });

      try {
        await pauseAlertsAfterHumanJoinImpl({
          liveMatch,
          joiningAccountId: sessionAccount.account.id,
          joiningPlayerId: payload?.playerID,
          participantType: payload?.participantType === "bot" ? "bot" : "human",
          matchID: payload?.matchID,
        });
      } catch (error) {
        logger.warn("Failed to pause match alerts after human join", {
          matchID: payload?.matchID,
          accountId: sessionAccount.account.id,
          error,
        });
      }

      const response = NextResponse.json(result);
      writeMatchCredentialCookie(response, {
        matchID: payload?.matchID,
        playerID: result?.playerID ?? payload?.playerID,
        credentials: result?.playerCredentials,
      });
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createMatchJoinRoute();
