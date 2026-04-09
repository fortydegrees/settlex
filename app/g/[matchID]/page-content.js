import { createElement as h } from "react";
import { notFound } from "next/navigation";
import { getMatchPageData } from "../../../lib/server/matches/getMatchPageData.js";
import { buildReplayFrames } from "../../../lib/server/replays/buildReplayFrames.js";
import { readMatchCredentialCookie } from "../../../lib/server/session/matchCredentialCookie.js";

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
      const initialPlayerID = searchParams?.playerID ?? null;
      const initialCredentials = await readSeatCredentialImpl({
        matchID: params?.matchID,
        playerID: initialPlayerID,
      });
      const MatchPageClientResolved =
        MatchPageClientImpl ??
        (await import("../../catana/lobby/[matchID]/MatchPageClient.js"))
          .MatchPageClient;

      return h(MatchPageClientResolved, {
        matchID: params?.matchID,
        initialPlayerID,
        initialCredentials,
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
