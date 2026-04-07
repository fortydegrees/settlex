import { NextResponse } from "next/server";
import { GAME_NAME, assertOk, getGameServerBaseUrl } from "../../../../lib/server/matches/joinMatchForAccount.js";

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to load match metadata" },
    { status: error?.status ?? 500 }
  );

export const createMatchDetailsRoute =
  ({ fetchImpl = fetch, baseUrl } = {}) =>
  async (_request, { params } = {}) => {
    try {
      const matchID = params?.matchID;
      if (!matchID) {
        return NextResponse.json({ error: "matchID is required" }, { status: 400 });
      }

      const match = await fetchImpl(
        `${getGameServerBaseUrl(baseUrl)}/games/${GAME_NAME}/${matchID}`,
        {
          method: "GET",
        }
      ).then(assertOk);

      return NextResponse.json(match);
    } catch (error) {
      return errorResponse(error);
    }
  };

export const GET = createMatchDetailsRoute();
