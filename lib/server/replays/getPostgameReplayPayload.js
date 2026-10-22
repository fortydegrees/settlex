import { getArchivedMatchByMatchId } from "../matches/getArchivedMatchByMatchId.js";
import { buildReplayFrames } from "./buildReplayFrames.js";
import { buildArchivedReplayPayload } from "./buildArchivedReplayPayload.js";

export const getPostgameReplayPayload = async (
  matchID,
  {
    getArchivedMatchByMatchId: readArchive = getArchivedMatchByMatchId,
    buildReplayFrames: buildFrames = buildReplayFrames,
  } = {}
) => {
  const replay = await readArchive(matchID);
  if (!replay) return null;
  return buildArchivedReplayPayload(replay, { buildReplayFrames: buildFrames });
};
