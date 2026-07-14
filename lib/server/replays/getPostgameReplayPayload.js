import { getArchivedMatchByMatchId } from "../matches/getArchivedMatchByMatchId.js";
import { buildReplayFrames } from "./buildReplayFrames.js";

export const getPostgameReplayPayload = async (
  matchID,
  {
    getArchivedMatchByMatchId: readArchive = getArchivedMatchByMatchId,
    buildReplayFrames: buildFrames = buildReplayFrames,
  } = {}
) => {
  const replay = await readArchive(matchID);
  if (!replay) return null;
  const frames = buildFrames({
    initialState: replay.initialState,
    log: replay.log,
    finalState: replay.finalState,
  });
  if (frames.length === 0) throw new Error("Replay has no valid frames");
  return { replay, frames };
};
