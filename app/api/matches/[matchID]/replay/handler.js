import { NextResponse } from "next/server";
import { getLiveMatch } from "../../../../../lib/server/matches/getLiveMatch.js";
import { getPostgameReplayPayload } from "../../../../../lib/server/replays/getPostgameReplayPayload.js";

export const createPostgameReplayRoute = ({
  getPostgameReplayPayload: loadPayload = getPostgameReplayPayload,
  getLiveMatch: loadLiveMatch = getLiveMatch,
} = {}) =>
  async (_request, { params } = {}) => {
    const matchID = params?.matchID;
    if (!matchID) {
      return NextResponse.json(
        { error: "matchID is required" },
        { status: 400 }
      );
    }
    try {
      const payload = await loadPayload(matchID);
      if (payload) return NextResponse.json(payload);
      let liveMatch = null;
      try {
        liveMatch = await loadLiveMatch({ matchID });
      } catch (error) {
        if (error?.status !== 404) throw error;
      }
      if (liveMatch?.gameover) {
        return NextResponse.json({ status: "preparing" }, { status: 202 });
      }
      if (liveMatch) {
        return NextResponse.json({ status: "active" }, { status: 409 });
      }
      return NextResponse.json({ status: "missing" }, { status: 404 });
    } catch (error) {
      return NextResponse.json(
        { status: "invalid", error: error.message },
        { status: 422 }
      );
    }
  };

export const GET = createPostgameReplayRoute();
