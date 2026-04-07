import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import { getPool } from "../../../../lib/server/db/getPool.js";

export const createAccountMeRoute =
  ({ pool } = {}) =>
  async (request) => {
    const resolvedPool = pool ?? getPool();
    const sessionAccount = await getSessionAccount({
      pool: resolvedPool,
      cookieHeader: request.headers.get("cookie") ?? "",
    });

    return NextResponse.json({
      account: sessionAccount?.account ?? null,
    });
  };

export const GET = createAccountMeRoute();
