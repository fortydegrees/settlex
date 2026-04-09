import { NextResponse } from "next/server";
import { listPublicOpenMatches } from "../../../../lib/server/matches/listPublicOpenMatches.js";

const errorResponse = (error) =>
  NextResponse.json(
    { error: error?.message ?? "Failed to load open matches" },
    { status: error?.status ?? 500 }
  );

export const createOpenMatchesRoute =
  ({
    listPublicOpenMatches: listPublicOpenMatchesImpl = listPublicOpenMatches,
  } = {}) =>
  async () => {
    try {
      const matches = await listPublicOpenMatchesImpl();
      return NextResponse.json({ matches });
    } catch (error) {
      return errorResponse(error);
    }
  };

export const GET = createOpenMatchesRoute();
