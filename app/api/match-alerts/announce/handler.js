import { NextResponse } from "next/server";
import { getSessionAccount } from "../../../../lib/server/accounts/getSessionAccount.js";
import { announceWaitingDuel } from "../../../../lib/server/matchAlerts/announceWaitingDuel.js";

const MAX_MATCH_ID_LENGTH = 256;

const unauthorizedResponse = () =>
  NextResponse.json(
    { error: "You must create or restore an account first." },
    { status: 401 }
  );

const invalidMatchResponse = () =>
  NextResponse.json({ error: "Invalid match ID." }, { status: 400 });

const notFoundResponse = () =>
  NextResponse.json({ error: "Match not found." }, { status: 404 });

const errorResponse = () =>
  NextResponse.json({ error: "Failed to announce match." }, { status: 500 });

export const createMatchAlertAnnouncePostRoute =
  ({
    getSessionAccount: getSessionAccountImpl = getSessionAccount,
    announceWaitingDuel: announceWaitingDuelImpl = announceWaitingDuel,
  } = {}) =>
  async (request) => {
    try {
      const session = await getSessionAccountImpl({
        cookieHeader: request.headers.get("cookie") ?? "",
      });
      if (!session?.account?.id) return unauthorizedResponse();

      let payload;
      try {
        payload = await request.json();
      } catch {
        return invalidMatchResponse();
      }
      const matchID =
        typeof payload?.matchID === "string" ? payload.matchID.trim() : "";
      if (!matchID || matchID.length > MAX_MATCH_ID_LENGTH) {
        return invalidMatchResponse();
      }

      const announcement = await announceWaitingDuelImpl({
        matchID,
        seekerAccountId: session.account.id,
      });
      if (announcement.reason === "not_eligible") return notFoundResponse();
      return NextResponse.json(announcement);
    } catch {
      return errorResponse();
    }
  };

export const POST = createMatchAlertAnnouncePostRoute();
