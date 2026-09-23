import { NextResponse } from "next/server";

import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import { cancelPublicMatchmakingForAccount } from "../../../../lib/server/matches/cancelPublicMatchmakingForAccount.js";
import { resolveMatchCreationMode } from "../../../../lib/server/matches/gameModeSetupData.js";
import { matchmakePublicMatchForAccount } from "../../../../lib/server/matches/matchmakePublicMatchForAccount.js";
import { readOptionalMatchmakingMutationToken } from "../../../../lib/server/matches/matchmakingMutation.js";
import {
  clearMatchCredentialCookie,
  writeMatchCredentialCookie,
} from "../../../../lib/server/session/matchCredentialCookie.js";

const unauthorizedResponse = () =>
  NextResponse.json(
    { error: "You must create or restore an account first." },
    { status: 401 }
  );

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to find a public match." },
    { status: error?.status ?? 500 }
  );

const readRequiredToken = (value, fieldName) => {
  const token = readOptionalMatchmakingMutationToken(value, fieldName);
  if (token) return token;
  throw Object.assign(new Error(`${fieldName} is required`), { status: 400 });
};

export const createPublicMatchmakingRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    matchmakePublicMatchForAccount:
      matchmakePublicMatchForAccountImpl = matchmakePublicMatchForAccount,
  } = {}) =>
  async (request) => {
    try {
      const sessionAccount = await getSessionAccountImpl({
        cookieHeader: request.headers.get("cookie") ?? "",
      });
      if (!sessionAccount?.account) return unauthorizedResponse();

      const payload = await request.json();
      const creationMode = resolveMatchCreationMode({
        modeId: payload?.modeId ?? "duel",
        numPlayers: 2,
      });
      const result = await matchmakePublicMatchForAccountImpl({
        account: sessionAccount.account,
        modeId: creationMode.setupData?.modeId ?? payload?.modeId,
        numPlayers: creationMode.numPlayers,
        setupData: creationMode.setupData,
        matchmakingRequestId: readRequiredToken(
          payload?.requestId,
          "requestId"
        ),
        requestedCredentials: readRequiredToken(
          payload?.requestedCredentials,
          "requestedCredentials"
        ),
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

export const POST = createPublicMatchmakingRoute();

export const createPublicMatchmakingCancelRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    cancelPublicMatchmakingForAccount:
      cancelPublicMatchmakingForAccountImpl = cancelPublicMatchmakingForAccount,
  } = {}) =>
  async (request) => {
    try {
      const sessionAccount = await getSessionAccountImpl({
        cookieHeader: request.headers.get("cookie") ?? "",
      });
      if (!sessionAccount?.account) return unauthorizedResponse();

      const payload = await request.json();
      const creationMode = resolveMatchCreationMode({
        modeId: payload?.modeId ?? "duel",
        numPlayers: 2,
      });
      const result = await cancelPublicMatchmakingForAccountImpl({
        account: sessionAccount.account,
        modeId: creationMode.setupData?.modeId ?? "duel",
        matchmakingRequestId: readRequiredToken(payload?.requestId, "requestId"),
        requestedCredentials: readRequiredToken(
          payload?.requestedCredentials,
          "requestedCredentials"
        ),
      });
      const response = NextResponse.json(result);
      for (const seat of result?.seats ?? []) {
        clearMatchCredentialCookie(response, seat);
      }
      if (result?.status === "match_found") {
        writeMatchCredentialCookie(response, {
          matchID: result.matchID,
          playerID: result.playerID,
          credentials: result.playerCredentials,
        });
      }
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };

export const DELETE = createPublicMatchmakingCancelRoute();
