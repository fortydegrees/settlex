import { createElement as h } from "react";
import { notFound } from "next/navigation";
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

export const createGMatchPage = ({
  getMatchPageData: getMatchPageDataImpl = getMatchPageData,
  buildReplayFrames: buildReplayFramesImpl = buildReplayFrames,
  readSeatCredential: readSeatCredentialImpl = readMatchCredentialCookie,
  MatchPageClient: MatchPageClientImpl = null,
  ReplayPageClient: ReplayPageClientImpl = null,
  notFoundImpl = notFound,
} = {}) =>
  async function GMatchPage({ params, searchParams }) {
    const pageData = await getMatchPageDataImpl(params?.matchID);

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
      const frames = buildReplayFramesImpl({
        initialState: archivedMatch.initialState,
        log: archivedMatch.log,
      });
      const ReplayPageClientResolved =
        ReplayPageClientImpl ??
        (await import("../../replays/[replayId]/ReplayPageClient.js"))
          .ReplayPageClient;

      return h(ReplayPageClientResolved, {
        replay: archivedMatch,
        frames,
        initialFrameIndex: Math.max(frames.length - 1, 0),
      });
    }

    return notFoundImpl();
  };

const GMatchPage = createGMatchPage();

export default GMatchPage;
