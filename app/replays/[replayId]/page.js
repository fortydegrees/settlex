import { createElement as h } from "react";
import { notFound } from "next/navigation";
import { getArchivedReplay } from "../../../lib/server/replays/getArchivedReplay.js";
import { buildReplayFrames } from "../../../lib/server/replays/buildReplayFrames.js";

export const createReplayPage = ({
  getArchivedReplay: getArchivedReplayImpl = getArchivedReplay,
  buildReplayFrames: buildReplayFramesImpl = buildReplayFrames,
  ReplayPageClient: ReplayPageClientImpl = null,
  notFoundImpl = notFound,
} = {}) =>
  async function ReplayPage({ params }) {
    const replay = await getArchivedReplayImpl(params?.replayId);

    if (!replay) {
      return notFoundImpl();
    }

    const frames = buildReplayFramesImpl({
      initialState: replay.initialState,
      log: replay.log,
    });
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
