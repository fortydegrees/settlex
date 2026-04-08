import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import { joinMatchForAccount } from "../../../../lib/server/matches/joinMatchForAccount.js";

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
    joinMatchForAccount: joinMatchForAccountImpl = joinMatchForAccount,
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

      return NextResponse.json(result);
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createMatchJoinRoute();
