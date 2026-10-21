import { resolveGameMode } from "../../shared/catanaGameModes.js";

export const resolveMatchCreationMode = ({
  modeId,
  numPlayers,
  setupData
} = {}) => {
  const requestedModeId = modeId ?? setupData?.modeId;
  if (!requestedModeId) return { numPlayers, setupData };
  if (setupData?.boardConfig != null && setupData?.boardSourceId != null) {
    throw new Error("boardConfig and boardSourceId are mutually exclusive");
  }

  const mode = resolveGameMode(requestedModeId);
  const resolvedBoardSourceId =
    setupData?.boardConfig != null
      ? null
      : setupData?.boardSourceId ?? mode.boardSourceId;
  return {
    numPlayers: mode.numPlayers,
    setupData: {
      ...(setupData ?? {}),
      modeId: mode.id,
      rulesetId: setupData?.rulesetId ?? mode.rulesetId,
      ...(resolvedBoardSourceId == null
        ? {}
        : { boardSourceId: resolvedBoardSourceId })
    }
  };
};
