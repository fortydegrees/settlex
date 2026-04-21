import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import { createMatchForAccount } from "../../../../lib/server/matches/createMatchForAccount.js";
import { resolveMatchCreationMode } from "../../../../lib/server/matches/gameModeSetupData.js";
import { writeMatchCredentialCookie } from "../../../../lib/server/session/matchCredentialCookie.js";

const unauthorizedResponse = () =>
  NextResponse.json({ error: "You must create or restore an account first." }, { status: 401 });

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to create match" },
    { status: error?.status ?? 500 }
  );

export const createMatchCreateRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    createMatchForAccount: createMatchForAccountImpl = createMatchForAccount,
  } = {}) =>
  async (request) => {
    try {
      const sessionAccount = await getSessionAccountImpl({
        cookieHeader: request.headers.get("cookie") ?? "",
      });

      if (!sessionAccount?.account) {
        return unauthorizedResponse();
      }

      const payload = await request.json();
      const creationMode = resolveMatchCreationMode({
        modeId: payload?.modeId,
        numPlayers: Number(payload?.numPlayers) || 2,
        setupData: payload?.setupData,
      });
      const result = await createMatchForAccountImpl({
        account: sessionAccount.account,
        numPlayers: creationMode.numPlayers,
        setupData: creationMode.setupData,
      });

      const response = NextResponse.json(result);
      writeMatchCredentialCookie(response, {
        matchID: result?.matchID,
        playerID: result?.playerID,
        credentials: result?.playerCredentials,
      });
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };

export const POST = createMatchCreateRoute();
