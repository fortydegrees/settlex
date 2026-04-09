import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import {
  FRIEND_CHALLENGE_TTL_MS,
  buildFriendChallengeSetupData,
} from "../../../../lib/server/matches/friendChallenge.js";
import { createMatchForAccount } from "../../../../lib/server/matches/createMatchForAccount.js";

const unauthorizedResponse = () =>
  NextResponse.json({ error: "You must create or restore an account first." }, { status: 401 });

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to create challenge" },
    { status: error?.status ?? 500 }
  );

const defaultPickInviterSeat = () => (Math.random() < 0.5 ? "0" : "1");

export const createChallengeCreateRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    createMatchForAccount: createMatchForAccountImpl = createMatchForAccount,
    pickInviterSeat = defaultPickInviterSeat,
    now = () => new Date(),
  } = {}) =>
  async (request) => {
    try {
      const sessionAccount = await getSessionAccountImpl({
        cookieHeader: request.headers.get("cookie") ?? "",
      });

      if (!sessionAccount?.account) {
        return unauthorizedResponse();
      }

      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + FRIEND_CHALLENGE_TTL_MS);
      const inviterSeatId = String(pickInviterSeat());
      const result = await createMatchForAccountImpl({
        account: sessionAccount.account,
        numPlayers: 2,
        creatorSeatId: inviterSeatId,
        setupData: buildFriendChallengeSetupData({
          inviterAccountId: sessionAccount.account.id,
          inviterSeatId,
          nowIso: createdAt.toISOString(),
          expiresAtIso: expiresAt.toISOString(),
        }),
      });

      return NextResponse.json({
        ...result,
        challengeUrl: `/challenge/${result.matchID}`,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createChallengeCreateRoute();
