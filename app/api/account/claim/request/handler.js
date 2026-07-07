import { NextResponse } from "next/server";

const legacyClaimResponse = () =>
  NextResponse.json(
    { error: "Email magic links were replaced by provider sign in." },
    { status: 410 }
  );

export const createAccountClaimRequestRoute =
  () =>
  async () =>
    legacyClaimResponse();

export const POST = createAccountClaimRequestRoute();
