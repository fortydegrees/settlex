import { createCatanGame } from "../../Game";

export function createSandboxGame(preset) {
  const baseGame = createCatanGame();
  const setupData = preset?.devScenarioState
    ? { devScenarioState: preset.devScenarioState }
    : undefined;

  return {
    ...baseGame,
    setup: (ctxBundle) => baseGame.setup(ctxBundle, setupData)
  };
}
