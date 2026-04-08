import { NextResponse } from "next/server";
import { createGuestAccount } from "../../../../lib/server/accounts/createGuestAccount.js";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import { updateGuestIdentity } from "../../../../lib/server/accounts/updateGuestIdentity.js";
import { getPool } from "../../../../lib/server/db/getPool.js";
import { writeSessionCookie } from "../../../../lib/server/session/writeSessionCookie.js";

const toErrorResponse = (error) => {
  const status = error?.status ?? 500;
  const message = status >= 500 ? "Failed to persist guest account" : error.message;
  return NextResponse.json({ error: message }, { status });
};

export const createAccountGuestRoute =
  ({ pool } = {}) =>
  async (request) => {
    try {
      const resolvedPool = pool ?? getPool();
      const payload = await request.json();
      const currentSession = await getSessionAccount({
        pool: resolvedPool,
        cookieHeader: request.headers.get("cookie") ?? "",
      });

      const result =
        currentSession?.account?.status === "guest"
          ? await updateGuestIdentity({
              pool: resolvedPool,
              accountId: currentSession.account.id,
              username: payload?.username,
              avatarEmoji: payload?.avatarEmoji,
              avatarColor: payload?.avatarColor,
            })
          : await createGuestAccount({
              pool: resolvedPool,
              username: payload?.username,
              avatarEmoji: payload?.avatarEmoji,
              avatarColor: payload?.avatarColor,
            });

      const response = NextResponse.json({ account: result.account });

      if (result.session) {
        writeSessionCookie(response, result.session);
      }

      return response;
    } catch (error) {
      return toErrorResponse(error);
    }
  };

export const POST = createAccountGuestRoute();
