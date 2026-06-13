import {
  buildTopology,
  createBalancedDiceState,
  createEmptyState,
  generateBoard,
  resolveDefaultGameModeId,
  resolveBoardConfig,
  resolveGameMode,
  resolveRuleset,
  ResourceType
} from "@settlex/game-core";

export const getPlacementOrder = (numPlayers) => {
  const ids = Array.from({ length: numPlayers }, (_, i) => i.toString());
  if (ids.length <= 1) {
    return ids;
  }
  return ids.concat([...ids].reverse());
};

const resolveGameSettings = (setupData) => ({
  showYearOfPlentyBankCounts:
    setupData?.gameSettings?.showYearOfPlentyBankCounts === true
});

export const resolveModeSetup = ({ numPlayers, setupData }) => {
  const modeId = setupData?.modeId ?? resolveDefaultGameModeId(numPlayers);
  const mode = resolveGameMode(modeId);
  const rulesetId = setupData?.rulesetId ?? mode.rulesetId;
  const boardConfigId =
    setupData?.boardConfigId ??
    (setupData?.boardConfig ? "custom" : mode.boardConfigId);

  return {
    modeId: mode.id,
    rulesetId,
    rulesetSpec: resolveRuleset(rulesetId),
    boardConfigId
  };
};

export const createInitialGameState = ({ ctx, random, setupData = {} }) => {
  const rng = () => {
    if (!random || typeof random.Number !== "function") {
      throw new Error("random.Number is required for deterministic board generation.");
    }
    return random.Number();
  };
  const {
    modeId,
    rulesetId,
    rulesetSpec,
    boardConfigId
  } = resolveModeSetup({
    numPlayers: ctx.numPlayers,
    setupData
  });
  const selectedBoardConfigId = setupData?.boardConfigId ?? boardConfigId;
  const boardConfig = setupData?.boardConfig ?? resolveBoardConfig(selectedBoardConfigId);
  const tiles = generateBoard(boardConfig, rng);
  const valids = { nodes: [], edges: [], tiles: [] };
  const diceRoll = [3, 4];
  const robberTile =
    tiles.find((tile) => tile.tile.resource === ResourceType.DESERT)?.tile.id ?? null;
  const coreTopology = buildTopology(tiles);
  const playerIds = Array.from({ length: ctx.numPlayers }, (_, i) => i.toString());
  const core = createEmptyState(playerIds, rulesetSpec);
  core.phase = ctx.phase === "placement" ? "placement" : "normal";
  core.robberTileId = robberTile;
  const placementOrder = getPlacementOrder(ctx.numPlayers);

  core.ruleset.friendlyRobber = { enabled: true, vpThreshold: 2 };

  if (core.devDeck && core.devDeck.length > 0) {
    core.devDeck = random.Shuffle(core.devDeck);
  }

  const diceState =
    core.ruleset.diceMode === "balanced"
      ? createBalancedDiceState(playerIds)
      : null;

  return {
    core,
    coreTopology,
    modeId,
    rulesetId,
    gameSettings: resolveGameSettings(setupData),
    boardConfigId,
    tiles,
    valids,
    diceRoll,
    diceState,
    robberTileId: robberTile,
    placementOrder,
    preGame: { readyByPlayerId: {} },
    devCardPlay: null,
    robberReturnToStage: null,
    gameLog: [],
    gameLogSeq: 0
  };
};
