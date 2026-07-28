import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import {
  finalizeAlertsAfterHumanJoin,
  reserveAlertsBeforeHumanJoin,
  restoreAlertsAfterFailedHumanJoin,
} from "../../../../lib/server/matchAlerts/humanMatchAlertPause.js";
import { isFriendChallengeMatch } from "../../../../lib/server/matches/friendChallenge.js";
import { isBotMatch } from "../../../../lib/server/matches/botMatch.js";
import { findHumanSeatForAccount } from "../../../../lib/server/matches/humanSeatOwnership.js";
import { getLiveMatch } from "../../../../lib/server/matches/getLiveMatch.js";
import { joinMatchForAccount } from "../../../../lib/server/matches/joinMatchForAccount.js";
import { withMatchMutationLock } from "../../../../lib/server/matches/matchMutationLock.js";
import { readOptionalMatchmakingMutationToken } from "../../../../lib/server/matches/matchmakingMutation.js";
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
    reserveAlertsBeforeHumanJoin:
      reserveAlertsBeforeHumanJoinImpl = reserveAlertsBeforeHumanJoin,
    finalizeAlertsAfterHumanJoin:
      finalizeAlertsAfterHumanJoinImpl = finalizeAlertsAfterHumanJoin,
    restoreAlertsAfterFailedHumanJoin:
      restoreAlertsAfterFailedHumanJoinImpl = restoreAlertsAfterFailedHumanJoin,
    withMatchMutationLock: withMatchMutationLockImpl = withMatchMutationLock,
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
      const participantType =
        payload?.participantType === "bot" ? "bot" : "human";
      const outcome = await withMatchMutationLockImpl({
        matchID: payload?.matchID,
        run: async () => {
          const liveMatch = await getLiveMatchImpl({
            matchID: payload?.matchID,
          });

          if (isBotMatch(liveMatch)) {
            return {
              response: NextResponse.json(
                { error: "Bot matches finish setup on the server." },
                { status: 403 }
              ),
            };
          }

          if (isFriendChallengeMatch(liveMatch)) {
            return {
              response: NextResponse.json(
                { error: "Private friend challenges must be joined through their challenge link." },
                { status: 403 }
              ),
            };
          }

          if (
            participantType === "human" &&
            findHumanSeatForAccount({
              match: liveMatch,
              accountId: sessionAccount.account.id,
            })
          ) {
            return {
              response: NextResponse.json(
                {
                  error: "You are already seated in this match.",
                  code: "ACCOUNT_ALREADY_SEATED",
                },
                { status: 409 }
              ),
            };
          }

          const reservation = await reserveAlertsBeforeHumanJoinImpl({
            liveMatch,
            joiningAccountId: sessionAccount.account.id,
            joiningPlayerId: payload?.playerID,
            participantType,
            matchID: payload?.matchID,
          });

          let result;
          try {
            const mutationIdentity =
              participantType === "bot"
                ? {}
                : {
                    matchmakingRequestId: readOptionalMatchmakingMutationToken(
                      payload?.matchmakingRequestId,
                      "matchmakingRequestId"
                    ),
                    requestedCredentials: readOptionalMatchmakingMutationToken(
                      payload?.requestedCredentials,
                      "requestedCredentials"
                    ),
                  };
            result = await joinMatchForAccountImpl({
              account: sessionAccount.account,
              matchID: payload?.matchID,
              playerID: payload?.playerID,
              participant:
                participantType === "bot"
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
              ...mutationIdentity,
            });
          } catch (error) {
            if (reservation) {
              try {
                await restoreAlertsAfterFailedHumanJoinImpl({
                  reservation,
                  joiningAccountId: sessionAccount.account.id,
                  joiningPlayerId: payload?.playerID,
                  matchID: payload?.matchID,
                  joinError: error,
                });
              } catch (restoreError) {
                logger.error("Failed to restore match alerts after rejected human join", {
                  matchID: payload?.matchID,
                  accountId: sessionAccount.account.id,
                  error: restoreError,
                });
              }
            }
            throw error;
          }

          if (reservation) {
            try {
              await finalizeAlertsAfterHumanJoinImpl({ reservation });
            } catch (finalizeError) {
              logger.warn("Failed to finalize match alert pause after human join", {
                matchID: payload?.matchID,
                accountId: sessionAccount.account.id,
                error: finalizeError,
              });
            }
          }

          return { result };
        },
      });

      if (outcome?.response) return outcome.response;
      const result = outcome?.result;

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
