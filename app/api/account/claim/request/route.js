import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../../lib/server/accounts/getSessionAccount.js";
import { requestMagicLink } from "../../../../../lib/server/accounts/requestMagicLink.js";

const unauthorized = () =>
  NextResponse.json({ error: "Sign in with your current account first." }, { status: 401 });

export const createAccountClaimRequestRoute =
  ({
    pool,
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    requestMagicLink: requestMagicLinkImpl = requestMagicLink,
  } = {}) =>
  async (request) => {
    try {
      const sessionAccount = await getSessionAccountImpl({
        pool,
        cookieHeader: request.headers.get("cookie") ?? "",
      });

      if (!sessionAccount?.account?.id) {
        return unauthorized();
      }

      const payload = await request.json();
      const result = await requestMagicLinkImpl({
        pool,
        accountId: sessionAccount.account.id,
        email: payload?.email,
      });

      return NextResponse.json({
        email: result.email,
        previewUrl: result.previewUrl ?? null,
      });
    } catch (error) {
      const status = error?.status ?? 500;
      return NextResponse.json(
        { error: status >= 500 ? "Failed to request claim link" : error.message },
        { status }
      );
    }
  };

export const POST = createAccountClaimRequestRoute();
