import { createElement as h } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSessionAccount } from "../../../lib/server/accounts/getSessionAccount.js";
import { getMatchPageData } from "../../../lib/server/matches/getMatchPageData.js";
import { buildReplayFrames } from "../../../lib/server/replays/buildReplayFrames.js";
import { readMatchCredentialCookie } from "../../../lib/server/session/matchCredentialCookie.js";

const readLivePlayerIDs = (liveMatch) => {
  const players = liveMatch?.players;
  if (Array.isArray(players)) {
    return players
      .map((player) => player?.id)
      .filter((playerID) => playerID != null)
      .map(String);
  }
  if (players && typeof players === "object") {
    return Object.values(players)
      .map((player) => player?.id)
      .filter((playerID) => playerID != null)
      .map(String);
  }
  return [];
};

const resolveInitialSeatCredential = async ({
  matchID,
  requestedPlayerID,
  liveMatch,
  readSeatCredential,
}) => {
  const playerIDs =
    requestedPlayerID != null
      ? [String(requestedPlayerID)]
      : readLivePlayerIDs(liveMatch);

  for (const playerID of playerIDs) {
    const credentials = await readSeatCredential({
      matchID,
      playerID,
    });

    if (credentials) {
      return { playerID, credentials };
    }
  }

  return {
    playerID: requestedPlayerID ?? null,
    credentials: null,
  };
};

export const resolveArchivedPerspectivePlayerID = async ({
  matchID,
  participants = [],
  accountId = null,
  readSeatCredential,
}) => {
  const accountParticipant = participants.find(
    (participant) =>
      accountId != null &&
      String(participant.accountId) === String(accountId)
  );
  if (accountParticipant?.seatId != null) {
    return String(accountParticipant.seatId);
  }
  for (const participant of participants) {
    const playerID = String(participant.seatId);
    if (await readSeatCredential({ matchID, playerID })) return playerID;
  }
  return null;
};

export const createGMatchPage = ({
  getMatchPageData: getMatchPageDataImpl = getMatchPageData,
  buildReplayFrames: buildReplayFramesImpl = buildReplayFrames,
  readSeatCredential: readSeatCredentialImpl = readMatchCredentialCookie,
  getSessionAccount: getSessionAccountImpl = getSessionAccount,
  headers: headersImpl = headers,
  MatchPageClient: MatchPageClientImpl = null,
  ReplayPageClient: ReplayPageClientImpl = null,
  ReplayStatusPage: ReplayStatusPageImpl = null,
  UnavailableMatchPage: UnavailableMatchPageImpl = null,
  notFoundImpl = notFound,
} = {}) =>
  async function GMatchPage({ params, searchParams }) {
    if (!params?.matchID) {
      return notFoundImpl();
    }

    const pageData = await getMatchPageDataImpl(params.matchID);

    if (pageData?.kind === "postgame-preparing") {
      const ReplayStatusPageResolved =
        ReplayStatusPageImpl ??
        (await import("../../replays/components/ReplayStatusPage.jsx"))
          .ReplayStatusPage;

      return h(ReplayStatusPageResolved, {
        matchID: params.matchID,
        status: "preparing",
      });
    }

    if (pageData?.kind === "live") {
      const requestedPlayerID = searchParams?.playerID ?? null;
      const initialSeat = await resolveInitialSeatCredential({
        matchID: params?.matchID,
        requestedPlayerID,
        liveMatch: pageData.liveMatch ?? null,
        readSeatCredential: readSeatCredentialImpl,
      });
      const MatchPageClientResolved =
        MatchPageClientImpl ??
        (await import("../../catana/lobby/[matchID]/MatchPageClient.js"))
          .MatchPageClient;

      return h(MatchPageClientResolved, {
        matchID: params?.matchID,
        initialPlayerID: initialSeat.playerID,
        initialCredentials: initialSeat.credentials,
        initialLiveMatch: pageData.liveMatch ?? null,
      });
    }

    if (pageData?.kind === "archived") {
      const archivedMatch = pageData.archivedMatch;
      let frames;
      try {
        frames = buildReplayFramesImpl({
          initialState: archivedMatch.initialState,
          log: archivedMatch.log,
          finalState: archivedMatch.finalState,
        });
        if (frames.length === 0) {
          throw new Error("Replay has no valid frames");
        }
      } catch (error) {
        const ReplayStatusPageResolved =
          ReplayStatusPageImpl ??
          (await import("../../replays/components/ReplayStatusPage.jsx"))
            .ReplayStatusPage;
        return h(ReplayStatusPageResolved, {
          matchID: params.matchID,
          status: "invalid",
        });
      }
      const ReplayPageClientResolved =
        ReplayPageClientImpl ??
        (await import("../../replays/[replayId]/ReplayPageClient.js"))
          .ReplayPageClient;

      let accountId = null;
      try {
        const sessionAccount = await getSessionAccountImpl({
          headers: headersImpl(),
        });
        accountId = sessionAccount?.account?.id ?? null;
      } catch (error) {
        accountId = null;
      }
      const initialPerspectivePlayerID =
        await resolveArchivedPerspectivePlayerID({
          matchID: params.matchID,
          participants: archivedMatch.participants,
          accountId,
          readSeatCredential: readSeatCredentialImpl,
        });

      return h(ReplayPageClientResolved, {
        replay: archivedMatch,
        frames,
        initialFrameIndex: 0,
        initialPerspectivePlayerID,
      });
    }

    return notFoundImpl();
  };

const GMatchPage = createGMatchPage();

export default GMatchPage;
