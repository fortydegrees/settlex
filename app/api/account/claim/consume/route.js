import { NextResponse } from "next/server";
import { consumeMagicLink } from "../../../../../lib/server/accounts/consumeMagicLink.js";

const buildRedirectUrl = (request, redirectTo, params) => {
  const url = new URL(redirectTo || "/account", request.url);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
};

export const createAccountClaimConsumeRoute =
  ({
    pool,
    consumeMagicLink: consumeMagicLinkImpl = consumeMagicLink,
  } = {}) =>
  async (request) => {
    const token = new URL(request.url).searchParams.get("token") ?? "";

    try {
      const result = await consumeMagicLinkImpl({
        pool,
        token,
      });

      return NextResponse.redirect(
        buildRedirectUrl(request, result.redirectTo, { claimed: "1" })
      );
    } catch (error) {
      return NextResponse.redirect(
        buildRedirectUrl(request, "/account", {
          claimError: error?.message ?? "Unable to claim account.",
        })
      );
    }
  };

export const GET = createAccountClaimConsumeRoute();
