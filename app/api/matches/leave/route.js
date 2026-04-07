import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import { leaveMatchForAccount } from "../../../../lib/server/matches/leaveMatchForAccount.js";

const unauthorizedResponse = () =>
  NextResponse.json({ error: "You must create or restore an account first." }, { status: 401 });

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to leave match" },
    { status: error?.status ?? 500 }
  );

export const createMatchLeaveRoute =
  ({ getSessionAccount: getSessionAccountImpl = getSessionAccount, leaveMatchForAccount: leaveMatchForAccountImpl = leaveMatchForAccount } = {}) =>
  async (request) => {
    try {
      const sessionAccount = await getSessionAccountImpl({
        cookieHeader: request.headers.get("cookie") ?? "",
      });

      if (!sessionAccount?.account) {
        return unauthorizedResponse();
      }

      const payload = await request.json();
      const result = await leaveMatchForAccountImpl({
        account: sessionAccount.account,
        matchID: payload?.matchID,
        playerID: payload?.playerID,
        credentials: payload?.credentials,
      });

      return NextResponse.json(result);
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createMatchLeaveRoute();
