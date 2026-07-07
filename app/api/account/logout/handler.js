import { NextResponse } from "next/server";
import { auth } from "../../../../lib/server/auth/betterAuth.js";
import { clearSessionCookie } from "../../../../lib/server/session/writeSessionCookie.js";

const appendHeaders = (response, headers) => {
  headers?.forEach((value, key) => {
    response.headers.append(key, value);
  });
};

export const createAccountLogoutRoute =
  ({ authImpl = auth } = {}) =>
  async (request) => {
    const response = NextResponse.json({ ok: true });

    try {
      const result = await authImpl.api.signOut({
        headers: request.headers,
        returnHeaders: true,
      });
      appendHeaders(response, result?.headers);
    } catch (error) {
      // Sign-out should be idempotent from the Settlex UI's point of view.
    }

    clearSessionCookie(response);
    return response;
  };

export const POST = createAccountLogoutRoute();
