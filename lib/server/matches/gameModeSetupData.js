import { resolveGameMode } from "@settlex/game-core";

export const resolveMatchCreationMode = ({
  modeId,
  numPlayers,
  setupData
} = {}) => {
  const requestedModeId = modeId ?? setupData?.modeId;
  if (!requestedModeId) {
    return { numPlayers, setupData };
  }

  const mode = resolveGameMode(requestedModeId);
  return {
    numPlayers: mode.numPlayers,
    setupData: {
      ...(setupData ?? {}),
      modeId: mode.id,
      rulesetId: mode.rulesetId,
      boardConfigId: mode.boardConfigId
    }
  };
};
