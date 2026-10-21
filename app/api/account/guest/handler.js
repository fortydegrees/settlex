import { NextResponse } from "next/server";
import { createGuestAccount } from "../../../../lib/server/accounts/createGuestAccount.js";
import { updateGuestIdentity } from "../../../../lib/server/accounts/updateGuestIdentity.js";
import { getPool } from "../../../../lib/server/db/getPool.js";
import { getCurrentPlayer } from "../../../../lib/server/players/getCurrentPlayer.js";

const toErrorResponse = (error) => {
  const status = error?.status ?? 500;
  const message = status >= 500 ? "Failed to persist guest account" : error.message;
  return NextResponse.json({ error: message }, { status });
};

export const createAccountGuestRoute =
  ({ pool, generateUsername, auth } = {}) =>
  async (request) => {
    try {
      const resolvedPool = pool ?? getPool();
      const payload = await request.json();
      const currentSession = await getCurrentPlayer({
        auth,
        pool: resolvedPool,
        headers: request.headers,
      });

      if (!currentSession?.user?.id) {
        return NextResponse.json(
          { error: "Sign in or start a guest session first." },
          { status: 401 }
        );
      }

      const result =
        currentSession?.account?.id
          ? await updateGuestIdentity({
              pool: resolvedPool,
              accountId: currentSession.account.id,
              username: payload?.username,
              usernameSource: payload?.usernameSource,
              generateUsername,
              avatarEmoji: payload?.avatarEmoji,
              avatarColor: payload?.avatarColor,
            })
          : await createGuestAccount({
              pool: resolvedPool,
              accountId: currentSession.user.id,
              status: currentSession.user.isAnonymous ? "guest" : "claimed",
              username: payload?.username,
              usernameSource: payload?.usernameSource,
              generateUsername,
              avatarEmoji: payload?.avatarEmoji,
              avatarColor: payload?.avatarColor,
            });

      const response = NextResponse.json({ account: result.account });
      return response;
    } catch (error) {
      return toErrorResponse(error);
    }
  };

export const POST = createAccountGuestRoute();
