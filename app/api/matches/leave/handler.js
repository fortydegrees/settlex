import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import { getLiveMatch } from "../../../../lib/server/matches/getLiveMatch.js";
import { leaveMatchForAccount } from "../../../../lib/server/matches/leaveMatchForAccount.js";
import { withMatchMutationLock } from "../../../../lib/server/matches/matchMutationLock.js";
import { clearMatchCredentialCookie } from "../../../../lib/server/session/matchCredentialCookie.js";

const unauthorizedResponse = () =>
  NextResponse.json({ error: "You must create or restore an account first." }, { status: 401 });

const errorResponse = (error) =>
  NextResponse.json(
    {
      error: error?.message ?? "Failed to leave match",
      ...(error?.code ? { code: error.code } : {}),
    },
    { status: error?.status ?? 500 }
  );

const getPlayers = (match = {}) => {
  const players = match?.players;
  return Array.isArray(players) ? players.filter(Boolean) : Object.values(players ?? {});
};

const isOccupiedHumanSeat = (player = {}) =>
  Boolean(player?.name || player?.data?.usernameSnapshot) &&
  player?.data?.participantType !== "bot";

const isFilledHumanDuelForAccount = ({ match, accountId, playerID }) => {
  const players = getPlayers(match);
  if (players.length !== 2 || !players.every(isOccupiedHumanSeat)) return false;
  const requestedSeat = players.find(
    (player) => String(player?.id) === String(playerID)
  );
  return requestedSeat?.data?.accountId === accountId;
};

export const createMatchLeaveRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    getLiveMatch: getLiveMatchImpl = getLiveMatch,
    leaveMatchForAccount: leaveMatchForAccountImpl = leaveMatchForAccount,
    withMatchMutationLock: withMatchMutationLockImpl = withMatchMutationLock,
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
      const result = await withMatchMutationLockImpl({
        matchID: payload?.matchID,
        run: async () => {
          if (payload?.intent === "matchmaking_cancel") {
            const liveMatch = await getLiveMatchImpl({
              matchID: payload?.matchID,
            });
            if (
              isFilledHumanDuelForAccount({
                match: liveMatch,
                accountId: sessionAccount.account.id,
                playerID: payload?.playerID,
              })
            ) {
              throw Object.assign(
                new Error("Another player has joined your duel."),
                { status: 409, code: "MATCH_FOUND" }
              );
            }
          }

          return leaveMatchForAccountImpl({
            account: sessionAccount.account,
            matchID: payload?.matchID,
            playerID: payload?.playerID,
            credentials: payload?.credentials,
          });
        },
      });

      const response = NextResponse.json(result);
      clearMatchCredentialCookie(response, {
        matchID: payload?.matchID,
        playerID: payload?.playerID,
      });
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createMatchLeaveRoute();
