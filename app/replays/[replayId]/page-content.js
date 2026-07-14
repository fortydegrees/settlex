import { createElement as h } from "react";
import { notFound } from "next/navigation";
import { getArchivedReplay } from "../../../lib/server/replays/getArchivedReplay.js";
import { buildReplayFrames } from "../../../lib/server/replays/buildReplayFrames.js";

export const createReplayPage = ({
  getArchivedReplay: getArchivedReplayImpl = getArchivedReplay,
  buildReplayFrames: buildReplayFramesImpl = buildReplayFrames,
  ReplayPageClient: ReplayPageClientImpl = null,
  ReplayStatusPage: ReplayStatusPageImpl = null,
  notFoundImpl = notFound,
} = {}) =>
  async function ReplayPage({ params }) {
    const replay = await getArchivedReplayImpl(params?.replayId);

    if (!replay) {
      return notFoundImpl();
    }

    let frames;
    try {
      frames = buildReplayFramesImpl({
        initialState: replay.initialState,
        log: replay.log,
        finalState: replay.finalState,
      });
      if (frames.length === 0) {
        throw new Error("Replay has no valid frames");
      }
    } catch (error) {
      const ReplayStatusPageResolved =
        ReplayStatusPageImpl ??
        (await import("../components/ReplayStatusPage.jsx"))
          .ReplayStatusPage;
      return h(ReplayStatusPageResolved, {
        matchID: replay.match.bgioMatchId ?? replay.match.replayId,
        status: "invalid",
      });
    }
    const ReplayPageClientResolved =
      ReplayPageClientImpl ??
      (await import("./ReplayPageClient.js")).ReplayPageClient;

    return h(ReplayPageClientResolved, {
      replay,
      frames,
    });
  };

const ReplayPage = createReplayPage();

export default ReplayPage;
