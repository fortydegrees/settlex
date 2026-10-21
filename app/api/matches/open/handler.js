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
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const modeId = searchParams.get("modeId") || undefined;
      const matches = await listPublicOpenMatchesImpl({ modeId });
      return NextResponse.json({ matches });
    } catch (error) {
      return errorResponse(error);
    }
  };

export const GET = createOpenMatchesRoute();
