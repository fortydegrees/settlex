import {
  buildableEdges,
  buildableNodes,
  createEmptyState
} from "@settlex/game-core";
import { HOME_DEMO_BOARD_PRESET } from "./homeDemoPreset";

const DEFAULT_DELAY_MS = Object.freeze([1000, 4000]);
const DEFAULT_WEIGHTS = Object.freeze({
  road: 0.58,
  settlement: 0.32,
  city: 0.1
});
const DEFAULT_PLAYER_IDS = Object.freeze([
  "home-blue",
  "home-red",
  "home-green",
  "home-orange"
]);

function hashSeed(seed) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function createSeededRandom(seed) {
  let value = hashSeed(seed);
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleInteger([min, max], random) {
  return Math.round(min + (max - min) * random());
}

function createPieceState(initialPieces) {
  return {
    roadsByEdgeId: Object.fromEntries(
      Object.entries(initialPieces?.roadsByEdgeId ?? {}).map(([edgeId, road]) => [
        edgeId,
        { ...road }
      ])
    ),
    buildingsByNodeId: Object.fromEntries(
      Object.entries(initialPieces?.buildingsByNodeId ?? {}).map(
        ([nodeId, building]) => [nodeId, { ...building }]
      )
    )
  };
}

function createCoreState(pieceState, playerIds) {
  const state = createEmptyState(playerIds);
  state.phase = "normal";
  state.roadsByEdgeId = Object.fromEntries(
    Object.entries(pieceState.roadsByEdgeId).map(([edgeId, road]) => [
      edgeId,
      road.playerId
    ])
  );
  state.buildingsByNodeId = Object.fromEntries(
    Object.entries(pieceState.buildingsByNodeId).map(([nodeId, building]) => [
      Number(nodeId),
      { ownerId: building.playerId, type: building.type }
    ])
  );
  return state;
}

function applyGeneratedEvent(pieceState, event) {
  if (event.type === "place-road") {
    const edgeId = event.target.edgeId;
    return {
      ...pieceState,
      roadsByEdgeId: {
        ...pieceState.roadsByEdgeId,
        [edgeId]: { edgeId, playerId: event.playerId }
      }
    };
  }

  const nodeId = event.target.nodeId;
  return {
    ...pieceState,
    buildingsByNodeId: {
      ...pieceState.buildingsByNodeId,
      [nodeId]: {
        nodeId,
        playerId: event.playerId,
        type: event.type === "place-city" ? "city" : "settlement"
      }
    }
  };
}

function shuffle(items, random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function pickWeighted(groups, random) {
  const totalWeight = groups.reduce((sum, group) => sum + group.weight, 0);
  if (totalWeight <= 0) return null;

  let cursor = random() * totalWeight;
  for (const group of groups) {
    cursor -= group.weight;
    if (cursor <= 0) {
      return group.items[Math.floor(random() * group.items.length)];
    }
  }

  const fallback = groups[groups.length - 1];
  return fallback.items[fallback.items.length - 1];
}

function getCityCandidates(pieceState, playerId, { cityCount, moveIndex, config }) {
  if (cityCount >= (config.maxCities ?? 1)) return [];
  if (moveIndex + 1 < (config.minCityMoveIndex ?? 5)) return [];

  return Object.values(pieceState.buildingsByNodeId)
    .filter((building) => building.playerId === playerId)
    .filter((building) => building.type === "settlement")
    .map((building) => ({
      type: "place-city",
      playerId,
      target: { nodeId: building.nodeId }
    }));
}

function getPlayerCandidates(pieceState, playerId, context) {
  const coreState = createCoreState(pieceState, context.playerIds);
  const board = HOME_DEMO_BOARD_PRESET.coreTopology;

  return {
    road: buildableEdges(coreState, board, playerId, {
      initialPlacement: false
    }).map((edgeId) => ({
      type: "place-road",
      playerId,
      target: { edgeId }
    })),
    settlement: buildableNodes(coreState, board, playerId, {
      initialPlacement: false
    }).map((nodeId) => ({
      type: "place-settlement",
      playerId,
      target: { nodeId }
    })),
    city: getCityCandidates(pieceState, playerId, context)
  };
}

function getPreferredPlayers(context) {
  const shuffledPlayers = shuffle(context.playerIds, context.random);
  const counts = context.moveCountsByPlayerId ?? {};
  const playerCounts = context.playerIds.map((playerId) => counts[playerId] ?? 0);
  const minCount = Math.min(...playerCounts);

  if (
    context.previousPlayerId &&
    (counts[context.previousPlayerId] ?? 0) <= minCount &&
    context.random() < (context.config.streakChance ?? 0.42)
  ) {
    return [
      context.previousPlayerId,
      ...shuffledPlayers.filter((playerId) => playerId !== context.previousPlayerId)
    ];
  }

  if (context.config.balancePlayers !== false) {
    return shuffledPlayers.sort(
      (a, b) => (counts[a] ?? 0) - (counts[b] ?? 0)
    );
  }

  return shuffledPlayers;
}

function chooseMove(pieceState, context) {
  const preferredPlayers = getPreferredPlayers(context);

  if (
    context.cityCount < (context.config.minCities ?? 0) &&
    context.moveIndex + 1 >= (context.config.minCityMoveIndex ?? 5)
  ) {
    for (const playerId of preferredPlayers) {
      const cityMoves = getPlayerCandidates(pieceState, playerId, context).city;
      if (cityMoves.length > 0) {
        return cityMoves[Math.floor(context.random() * cityMoves.length)];
      }
    }
  }

  for (const playerId of preferredPlayers) {
    const candidates = getPlayerCandidates(pieceState, playerId, context);
    const groups = Object.entries(candidates)
      .filter(([, items]) => items.length > 0)
      .map(([type, items]) => ({
        type,
        items,
        weight: context.weights[type] ?? 0
      }))
      .filter((group) => group.weight > 0);

    if (groups.length > 0) {
      return pickWeighted(groups, context.random);
    }
  }

  return null;
}

export function generateHomeDemoProceduralEvents(scene, options = {}) {
  const config = scene?.procedural;
  if (!config) return [];

  const cycleIndex = options.cycleIndex ?? 0;
  const playerIds = config.playerIds ?? DEFAULT_PLAYER_IDS;
  const random = createSeededRandom(`${config.seed ?? scene.id}:${cycleIndex}`);
  const delayMs = config.delayMs ?? DEFAULT_DELAY_MS;
  const weights = { ...DEFAULT_WEIGHTS, ...(config.weights ?? {}) };
  const maxMoves = config.maxMoves ?? 20;
  const latestEventAtMs = Math.max(0, scene.durationMs - (config.endPaddingMs ?? 800));
  const events = [];
  let pieceState = createPieceState(scene.initialPieces);
  let elapsedMs = 0;
  let previousPlayerId = null;
  const moveCountsByPlayerId = Object.fromEntries(
    playerIds.map((playerId) => [playerId, 0])
  );
  let cityCount = 0;

  for (let moveIndex = 0; moveIndex < maxMoves; moveIndex += 1) {
    elapsedMs += sampleInteger(delayMs, random);
    if (elapsedMs >= latestEventAtMs) break;

    const move = chooseMove(pieceState, {
      cityCount,
      config,
      moveIndex,
      moveCountsByPlayerId,
      playerIds,
      previousPlayerId,
      random,
      weights
    });

    if (!move) break;

    const event = {
      id: `${scene.id}-procedural-${events.length + 1}`,
      ...move,
      atMs: elapsedMs
    };

    events.push(event);
    pieceState = applyGeneratedEvent(pieceState, event);
    moveCountsByPlayerId[event.playerId] += 1;
    previousPlayerId = event.playerId;
    if (event.type === "place-city") cityCount += 1;
  }

  return events;
}
