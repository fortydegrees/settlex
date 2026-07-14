import {
  buildTopology,
  createBalancedDiceState,
  createEmptyState,
  resolveRuleset,
  ResourceType
} from "@settlex/game-core";
import {
  resolveDefaultGameModeId,
  resolveGameMode
} from "../../../lib/shared/catanaGameModes.js";
import {
  materializeBoardSource,
  materializeCustomBoard
} from "./boardSources.js";

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
  if (setupData?.boardConfigId != null) {
    throw new Error("setupData.boardConfigId is not supported; use boardSourceId");
  }
  if (setupData?.boardConfig != null && setupData?.boardSourceId != null) {
    throw new Error("boardConfig and boardSourceId are mutually exclusive");
  }

  const modeId = setupData?.modeId ?? resolveDefaultGameModeId(numPlayers);
  const mode = resolveGameMode(modeId);
  const rulesetId = setupData?.rulesetId ?? mode.rulesetId;
  return {
    modeId: mode.id,
    rulesetId,
    rulesetSpec: resolveRuleset(rulesetId),
    boardSourceId:
      setupData?.boardConfig != null
        ? "custom"
        : setupData?.boardSourceId ?? mode.boardSourceId
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
    boardSourceId
  } = resolveModeSetup({
    numPlayers: ctx.numPlayers,
    setupData
  });
  const materializedBoard =
    setupData?.boardConfig != null
      ? materializeCustomBoard({ boardConfig: setupData.boardConfig, rng })
      : materializeBoardSource({ boardSourceId, rng });
  const {
    boardSourceId: resolvedBoardSourceId,
    boardConfigId,
    boardProvenance,
    tiles
  } = materializedBoard;
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
    boardSourceId: resolvedBoardSourceId,
    boardConfigId,
    boardProvenance,
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
