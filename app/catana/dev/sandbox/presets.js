import { createCatanGame } from "../../Game";
import { placeRoad, placeSettlement, updateValids } from "../../Moves";

const SANDBOX_COLORS = ["sky", "rose", "amber", "lime"];
const SANDBOX_EMOJIS = ["😀", "😎", "🤖", "🦊"];

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const createDeterministicRandom = () => ({
  Number: () => 0.5,
  Shuffle: (items) => [...items]
});

const createPlayerIds = (numPlayers) =>
  Array.from({ length: numPlayers }, (_, index) => String(index));

const createPlacementContext = (numPlayers) => {
  const playerIds = createPlayerIds(numPlayers);

  return {
    numPlayers,
    phase: "placement",
    currentPlayer: playerIds[0],
    playOrder: playerIds,
    playOrderPos: 0,
    activePlayers: { [playerIds[0]]: "settlement" }
  };
};

const setNormalTurnState = (
  G,
  {
    playerId = "0",
    turnPhase = "preRoll",
    hasRolled = turnPhase !== "preRoll",
    lastRollTotal = hasRolled ? 8 : null,
    pendingDiscards = [],
    robberReturnToStage = null
  } = {}
) => {
  G.core.phase = "normal";
  G.core.turn.currentPlayerId = String(playerId);
  G.core.turn.phase = turnPhase;
  G.core.turn.hasRolled = hasRolled;
  G.core.turn.lastRollTotal = lastRollTotal;
  G.core.turn.pendingDiscards = [...pendingDiscards];
  G.robberReturnToStage = robberReturnToStage;
  G.valids = { nodes: [], edges: [], tiles: [] };
};

const createPlacementGame = (numPlayers) => {
  const game = createCatanGame({ includeEffects: false });
  const ctx = createPlacementContext(numPlayers);
  const G = game.setup({ ctx, random: createDeterministicRandom() }, {});

  updateValids({ G, ctx, playerID: ctx.currentPlayer }, "settlement");

  return { G, ctx };
};

const createPlacementMoveContext = (G, ctx, playerID) => ({
  G,
  ctx,
  playerID,
  effects: {},
  log: { setMetadata() {} },
  events: {
    setStage(stage) {
      ctx.activePlayers = { [playerID]: stage };
    },
    endTurn() {},
    endStage() {}
  }
});

const simulatePlacementSettlement = (G, ctx, playerID) => {
  ctx.currentPlayer = playerID;
  G.core.turn.currentPlayerId = playerID;
  ctx.activePlayers = { [playerID]: "settlement" };

  updateValids({ G, ctx, playerID }, "settlement");
  const nodeId = G.valids.nodes[0];
  const moveContext = createPlacementMoveContext(G, ctx, playerID);
  placeSettlement.move(moveContext, nodeId);
};

const simulatePlacementTurn = (G, ctx, playerID) => {
  simulatePlacementSettlement(G, ctx, playerID);
  const moveContext = createPlacementMoveContext(G, ctx, playerID);
  const edgeId = G.valids.edges[0];
  placeRoad.move(moveContext, edgeId);
};

const createStartedGame = (numPlayers) => {
  const { G, ctx } = createPlacementGame(numPlayers);

  G.placementOrder.forEach((playerID) => {
    simulatePlacementTurn(G, ctx, String(playerID));
  });

  setNormalTurnState(G, { playerId: "0", turnPhase: "preRoll", hasRolled: false });

  return G;
};

const addResources = (G, playerID, resources) => {
  G.core.playerStateById[String(playerID)].resources = [...resources];
};

const addDevCards = (G, playerID, devCards) => {
  const playerState = G.core.playerStateById[String(playerID)];
  playerState.devCards = [...devCards];
  playerState.devCardsBoughtThisTurn = [];
  playerState.devCardsPlayedThisTurn = 0;
};

const createGeneralScenario = () => {
  const G = createStartedGame(4);
  setNormalTurnState(G, { playerId: "0", turnPhase: "postRoll" });
  addResources(G, "0", [
    "Wood",
    "Brick",
    "Sheep",
    "Wheat",
    "Ore",
    "Ore",
    "Ore",
    "Wheat"
  ]);
  addDevCards(G, "0", ["knight"]);
  return G;
};

const createPreRollScenario = () => {
  const G = createStartedGame(4);
  setNormalTurnState(G, { playerId: "0", turnPhase: "preRoll", hasRolled: false });
  return G;
};

const createPostRollScenario = () => {
  const G = createStartedGame(4);
  setNormalTurnState(G, { playerId: "0", turnPhase: "postRoll" });
  addResources(G, "0", [
    "Wood",
    "Brick",
    "Sheep",
    "Wheat",
    "Ore",
    "Ore",
    "Ore",
    "Wheat"
  ]);
  return G;
};

const createSettlementPlacementScenario = () => createPlacementGame(4).G;

const createRoadPlacementScenario = () => {
  const { G, ctx } = createPlacementGame(4);
  simulatePlacementSettlement(G, ctx, "0");
  G.core.phase = "placement";
  G.core.turn.currentPlayerId = "0";
  return G;
};

const createRobberMoveScenario = () => {
  const G = createStartedGame(4);
  setNormalTurnState(G, {
    playerId: "0",
    turnPhase: "robberMove",
    robberReturnToStage: "postRoll"
  });
  addResources(G, "1", ["Wood", "Sheep"]);
  addResources(G, "2", ["Brick", "Wheat"]);
  return G;
};

const createTradeReadyScenario = () => {
  const G = createStartedGame(4);
  setNormalTurnState(G, { playerId: "0", turnPhase: "postRoll" });
  addResources(G, "0", ["Wood", "Wood", "Wood", "Wood", "Brick", "Brick"]);
  return G;
};

const createDevCardReadyScenario = () => {
  const G = createStartedGame(4);
  setNormalTurnState(G, { playerId: "0", turnPhase: "postRoll" });
  addResources(G, "0", ["Sheep", "Wheat", "Ore", "Sheep", "Wheat", "Ore"]);
  addDevCards(G, "0", ["knight", "monopoly"]);
  return G;
};

const createGameOverScenario = () => {
  const G = createStartedGame(4);
  setNormalTurnState(G, { playerId: "0", turnPhase: "postRoll" });
  G.core.gameOver = { winnerId: "0", reason: "victoryPoints" };
  return G;
};

const PRESET_DEFINITIONS = [
  {
    id: "default",
    label: "General sandbox",
    numPlayers: 4,
    createScenarioState: createGeneralScenario
  },
  {
    id: "pre-roll",
    label: "Pre-roll",
    numPlayers: 4,
    createScenarioState: createPreRollScenario
  },
  {
    id: "post-roll",
    label: "Post-roll",
    numPlayers: 4,
    createScenarioState: createPostRollScenario
  },
  {
    id: "settlement-placement",
    label: "Settlement placement",
    numPlayers: 4,
    createScenarioState: createSettlementPlacementScenario
  },
  {
    id: "road-placement",
    label: "Road placement",
    numPlayers: 4,
    createScenarioState: createRoadPlacementScenario
  },
  {
    id: "robber-move",
    label: "Robber move",
    numPlayers: 4,
    createScenarioState: createRobberMoveScenario
  },
  {
    id: "trade-ready",
    label: "Trade ready",
    numPlayers: 4,
    createScenarioState: createTradeReadyScenario
  },
  {
    id: "dev-card-ready",
    label: "Dev-card ready",
    numPlayers: 4,
    createScenarioState: createDevCardReadyScenario
  },
  {
    id: "game-over",
    label: "Game over",
    numPlayers: 4,
    createScenarioState: createGameOverScenario
  }
];

export const SANDBOX_PRESETS = PRESET_DEFINITIONS.map((preset) => {
  const playerIds = createPlayerIds(preset.numPlayers);

  return {
    ...preset,
    playerIds,
    defaultViewerSeat: playerIds[0],
    devScenarioState: preset.createScenarioState()
  };
});

export function getSandboxPreset(id) {
  return (
    SANDBOX_PRESETS.find((preset) => preset.id === id) ?? SANDBOX_PRESETS[0]
  );
}

export function coerceViewerSeat(preset, viewerSeat) {
  const playerIds = preset?.playerIds ?? [];
  if (playerIds.includes(String(viewerSeat))) {
    return String(viewerSeat);
  }
  return playerIds[0] ?? "0";
}

export function buildSandboxMatchMetadata(preset) {
  return (preset?.playerIds ?? []).map((playerId, index) => ({
    id: playerId,
    name: `Visitor ${index + 1}`,
    data: {
      emoji: SANDBOX_EMOJIS[index % SANDBOX_EMOJIS.length],
      color: SANDBOX_COLORS[index % SANDBOX_COLORS.length]
    }
  }));
}

export function cloneSandboxPreset(id) {
  const preset = getSandboxPreset(id);
  return {
    ...preset,
    playerIds: [...preset.playerIds],
    devScenarioState: cloneValue(preset.devScenarioState)
  };
}
