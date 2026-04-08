import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import { createMatchForAccount } from "../../../../lib/server/matches/createMatchForAccount.js";

const unauthorizedResponse = () =>
  NextResponse.json({ error: "You must create or restore an account first." }, { status: 401 });

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to create match" },
    { status: error?.status ?? 500 }
  );

export const createMatchCreateRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    createMatchForAccount: createMatchForAccountImpl = createMatchForAccount,
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
      const result = await createMatchForAccountImpl({
        account: sessionAccount.account,
        numPlayers: Number(payload?.numPlayers) || 2,
        setupData: payload?.setupData,
      });

      return NextResponse.json(result);
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createMatchCreateRoute();
