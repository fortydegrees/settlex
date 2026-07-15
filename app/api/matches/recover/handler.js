import { NextResponse } from "next/server";

import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import {
  findMatchmakingMutationSeats,
  readOptionalMatchmakingMutationToken,
} from "../../../../lib/server/matches/matchmakingMutation.js";

const unauthorizedResponse = () =>
  NextResponse.json(
    { error: "You must create or restore an account first." },
    { status: 401 }
  );

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to recover matchmaking." },
    { status: error?.status ?? 500 }
  );

export const createMatchRecoveryRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    findMatchmakingMutationSeats:
      findMatchmakingMutationSeatsImpl = findMatchmakingMutationSeats,
  } = {}) =>
  async (request) => {
    try {
      const sessionAccount = await getSessionAccountImpl({
        cookieHeader: request.headers.get("cookie") ?? "",
      });
      if (!sessionAccount?.account) return unauthorizedResponse();

      const payload = await request.json();
      const requestId = readOptionalMatchmakingMutationToken(
        payload?.requestId,
        "requestId"
      );
      if (!requestId) {
        return NextResponse.json(
          { error: "requestId is required" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        seats: await findMatchmakingMutationSeatsImpl({
          accountId: sessionAccount.account.id,
          requestId,
        }),
      });
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createMatchRecoveryRoute();
