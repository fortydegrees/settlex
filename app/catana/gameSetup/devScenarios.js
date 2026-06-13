export const isDebugEnvironment = (nodeEnv = process.env.NODE_ENV) =>
  nodeEnv !== "production";

const isScenarioStateLike = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      value.core &&
      Array.isArray(value.core.players)
  );

export const extractScenarioState = (value) => {
  if (isScenarioStateLike(value?.state)) return value.state;
  if (isScenarioStateLike(value?.G)) return value.G;
  if (isScenarioStateLike(value)) return value;
  return null;
};

const cloneScenarioState = (value) => JSON.parse(JSON.stringify(value));

const mergeScenarioState = (baseState, scenarioState) => ({
  ...baseState,
  ...scenarioState,
  core: scenarioState.core ?? baseState.core,
  coreTopology: scenarioState.coreTopology ?? baseState.coreTopology,
  tiles: scenarioState.tiles ?? baseState.tiles,
  valids: scenarioState.valids ?? baseState.valids,
  diceRoll: scenarioState.diceRoll ?? baseState.diceRoll,
  diceState: scenarioState.diceState ?? baseState.diceState,
  robberTileId: scenarioState.robberTileId ?? baseState.robberTileId,
  placementOrder: scenarioState.placementOrder ?? baseState.placementOrder,
  preGame: scenarioState.preGame ?? baseState.preGame,
  devCardPlay: scenarioState.devCardPlay ?? baseState.devCardPlay,
  robberReturnToStage:
    scenarioState.robberReturnToStage ?? baseState.robberReturnToStage,
  gameLog: scenarioState.gameLog ?? baseState.gameLog,
  gameLogSeq: scenarioState.gameLogSeq ?? baseState.gameLogSeq,
  modeId: scenarioState.modeId ?? baseState.modeId,
  rulesetId: scenarioState.rulesetId ?? baseState.rulesetId,
  boardConfigId: scenarioState.boardConfigId ?? baseState.boardConfigId
});

const buildResignableActivePlayers = (playerIds, stageAssignments) => {
  const entries = Object.entries(stageAssignments ?? {});
  if (entries.length === 0) {
    return null;
  }

  const activePlayers = {};
  for (const playerId of playerIds ?? []) {
    activePlayers[String(playerId)] = null;
  }

  for (const [playerId, stage] of entries) {
    activePlayers[String(playerId)] = stage;
  }

  return activePlayers;
};

const derivePlacementStage = (scenarioState, currentPlayerId) => {
  const hasRoadTargets = (scenarioState?.valids?.edges?.length ?? 0) > 0;
  if (hasRoadTargets) return "road";
  const pendingRoadNodeId =
    scenarioState?.core?.pendingRoadFromNodeIdByPlayer?.[currentPlayerId];
  if (pendingRoadNodeId != null) return "road";
  return "settlement";
};

const deriveNormalActivePlayers = (scenarioState, currentPlayerId) => {
  const playerIds = scenarioState?.core?.players ?? [];
  const turnPhase = scenarioState?.core?.turn?.phase;
  if (turnPhase === "robberDiscard") {
    const pendingDiscards = scenarioState?.core?.turn?.pendingDiscards ?? [];
    if (pendingDiscards.length > 0) {
      return buildResignableActivePlayers(
        playerIds,
        pendingDiscards.reduce((acc, playerId) => {
          acc[playerId] = "robberDiscard";
          return acc;
        }, {})
      );
    }
    if (currentPlayerId != null) {
      return buildResignableActivePlayers(playerIds, {
        [currentPlayerId]: "robberDiscard"
      });
    }
  }

  if (turnPhase === "robberMove") {
    return currentPlayerId != null
      ? buildResignableActivePlayers(playerIds, {
          [currentPlayerId]: "moveRobber"
        })
      : null;
  }

  if (turnPhase === "postRoll") {
    return currentPlayerId != null
      ? buildResignableActivePlayers(playerIds, {
          [currentPlayerId]: "postRoll"
        })
      : null;
  }

  return currentPlayerId != null
    ? buildResignableActivePlayers(playerIds, {
        [currentPlayerId]: "preRoll"
      })
    : null;
};

export const seedContextFromScenario = (ctx, scenarioState) => {
  const scenarioPlayers = scenarioState?.core?.players?.map(String) ?? null;
  const currentPlayerId =
    scenarioState?.core?.turn?.currentPlayerId != null
      ? String(scenarioState.core.turn.currentPlayerId)
      : null;

  if (scenarioPlayers?.length) {
    ctx.playOrder = [...scenarioPlayers];
    ctx.numPlayers = scenarioPlayers.length;
  }

  if (currentPlayerId != null) {
    ctx.currentPlayer = currentPlayerId;
    const nextPlayOrderPos = ctx.playOrder?.indexOf?.(currentPlayerId) ?? -1;
    if (nextPlayOrderPos >= 0) {
      ctx.playOrderPos = nextPlayOrderPos;
    }
  }

  if (scenarioState?.core?.phase === "placement") {
    ctx.phase = "placement";
    const stage = derivePlacementStage(scenarioState, currentPlayerId);
    ctx.activePlayers =
      currentPlayerId != null
        ? buildResignableActivePlayers(scenarioPlayers, {
            [currentPlayerId]: stage
          })
        : ctx.activePlayers;
    return;
  }

  if (scenarioState?.core?.phase === "normal") {
    ctx.phase = "main";
    const activePlayers = deriveNormalActivePlayers(
      scenarioState,
      currentPlayerId
    );
    if (activePlayers) {
      ctx.activePlayers = activePlayers;
    }
  }
};

export const validateScenarioSetupData = (
  setupData,
  numPlayers,
  { nodeEnv = process.env.NODE_ENV } = {}
) => {
  const scenarioState = extractScenarioState(setupData?.devScenarioState);
  if (!scenarioState) return undefined;
  if (!isDebugEnvironment(nodeEnv)) {
    return "Dev scenarios are disabled in production.";
  }
  const scenarioPlayerCount = scenarioState.core?.players?.length;
  if (
    Number.isFinite(scenarioPlayerCount) &&
    Number.isFinite(numPlayers) &&
    scenarioPlayerCount !== numPlayers
  ) {
    return `Scenario requires ${scenarioPlayerCount} players.`;
  }
  return undefined;
};

export const applyDevScenarioSetup = ({
  initialState,
  ctx,
  setupData,
  nodeEnv = process.env.NODE_ENV
}) => {
  const scenarioState = extractScenarioState(setupData?.devScenarioState);
  if (!isDebugEnvironment(nodeEnv) || !scenarioState) {
    return initialState;
  }

  const nextState = mergeScenarioState(
    initialState,
    cloneScenarioState(scenarioState)
  );
  seedContextFromScenario(ctx, nextState);
  return nextState;
};
