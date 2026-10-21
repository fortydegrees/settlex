import { NextResponse } from "next/server";

const buildRedirectUrl = (request) => {
  const url = new URL("/account", request.url);
  url.searchParams.set(
    "authError",
    "Email magic links were replaced by provider sign in."
  );
  return url;
};

export const createAccountClaimConsumeRoute =
  () =>
  async (request) =>
    NextResponse.redirect(buildRedirectUrl(request));

export const GET = createAccountClaimConsumeRoute();
