import { bestTradeRate } from "@settlex/game-core";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { SettlexSelfPlayEnv } = require("../../ai/pufferlib/js/settlexEnv.cjs");

function sortEdgeId(a, b) {
  const [a0, a1] = String(a).split(",").map(Number);
  const [b0, b1] = String(b).split(",").map(Number);
  if (a0 !== b0) return a0 - b0;
  return a1 - b1;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function defaultPlacementOrder(players) {
  if (players.length <= 1) {
    return [...players];
  }
  const forward = [...players];
  const reverse = [...players].reverse();
  return forward.concat(reverse);
}

function inferPlacementStage(ctx) {
  const stage = ctx?.activePlayers?.[ctx?.currentPlayer] ?? "";
  return stage === "road" ? "road" : "settlement";
}

function inferPlacementIndex(ctx, placementOrder) {
  const rawTurn = Number(ctx?.turn ?? 1);
  const preferredTurnIndex = Number.isFinite(rawTurn) ? rawTurn - 1 : 0;
  const currentPlayerId = String(ctx?.currentPlayer ?? "");

  const matchingIndices = placementOrder.reduce((indices, playerId, index) => {
    if (String(playerId) === currentPlayerId) {
      indices.push(index);
    }
    return indices;
  }, []);

  if (matchingIndices.length > 0) {
    return matchingIndices.reduce((best, candidate) => {
      const bestDistance = Math.abs(best - preferredTurnIndex);
      const candidateDistance = Math.abs(candidate - preferredTurnIndex);
      return candidateDistance < bestDistance ? candidate : best;
    }, matchingIndices[0]);
  }

  const turnIndex = preferredTurnIndex;
  const maxIndex = Math.max(0, placementOrder.length - 1);
  return Math.max(0, Math.min(maxIndex, turnIndex));
}

function buildPendingRoadBuilding(G, ctx) {
  const devPlay = G?.devCardPlay;
  if (!devPlay || devPlay.type !== "roadBuilding" || devPlay.pendingRoads <= 0) {
    return null;
  }
  const stage = ctx?.activePlayers?.[ctx?.currentPlayer] ?? "postRoll";
  return {
    playerId: devPlay.playerId,
    roadsToPlace: devPlay.pendingRoads,
    returnToMode: stage === "preRoll" ? "preRoll" : "postRoll"
  };
}

function inferModeOverride(ctx) {
  if (!ctx) return null;

  const stage =
    ctx?.activePlayers?.[ctx.currentPlayer] ??
    ctx?.activePlayers?.all ??
    "";

  if (ctx.phase === "placement") {
    if (stage === "road") return "placement_road";
    if (stage === "settlement") return "placement_settlement";
  }

  if (ctx.phase === "main") {
    if (stage === "moveRobber") return "robberMove";
    if (stage === "robberDiscard") return "robberDiscard";
  }

  return null;
}

function cloneValue(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function hydrateEnvFromMatchState(state, options = {}) {
  const { G, ctx } = state;
  if (!G?.core || !G?.coreTopology || !ctx) {
    throw new Error("Expected boardgame state with G.core, G.coreTopology, and ctx.");
  }

  const players = [...(G.core.players ?? [])];
  const placementOrder =
    Array.isArray(G.placementOrder) && G.placementOrder.length > 0
      ? [...G.placementOrder]
      : defaultPlacementOrder(players);

  const env = new SettlexSelfPlayEnv({
    boardConfigId: G.boardConfigId ?? options.boardConfigId ?? "standard-official",
    numPlayers: players.length,
    maxSteps: options.maxSteps ?? 1200,
    includeActionMaskInObservation: true,
    friendlyRobber: true
  });

  env.closed = false;
  env.initialized = true;
  env.done = Boolean(G.core.gameOver);
  env.truncated = false;
  env.seed = 0;
  env.rng = Math.random;
  env.steps = Math.max(0, Number(ctx.turn ?? 1) - 1);

  env.state = cloneValue(G.core);
  env.topology = G.coreTopology;
  env.tiles = G.tiles ?? [];

  env.players = players;
  env.placementOrder = placementOrder;
  env.placementIndex = inferPlacementIndex(ctx, placementOrder);
  env.placementStage = ctx.phase === "placement" ? inferPlacementStage(ctx) : "done";

  env.pendingRoadBuilding = buildPendingRoadBuilding(G, ctx);
  env.pendingRobberReturnMode = G.robberReturnToStage ?? null;
  env.modeOverride = inferModeOverride(ctx);

  env.nodeIds = [...env.topology.nodeIds].sort((a, b) => a - b);
  env.edgeIds = [...env.topology.edgeIds].sort(sortEdgeId);
  env.landTileIds = env.topology.tiles
    .filter((tile) => String(tile.type).toLowerCase() === "land")
    .map((tile) => tile.tile.id)
    .sort((a, b) => a - b);
  env.landTileById = new Map(
    env.topology.tiles
      .filter((tile) => String(tile.type).toLowerCase() === "land")
      .map((tile) => [tile.tile.id, tile])
  );
  env.nodeFeatureById = env._buildStaticNodeFeatures();

  env._configureActionSpace();
  env.observationLayout = env._buildObservationLayout();
  env.baseObservationSize = env._buildBaseObservation(env._getActorId()).length;
  const actionLabels = Array.from({ length: env.actionCount }, (_, index) =>
    env._actionLabel(index)
  );
  env.actionSpaceHash = hashString(JSON.stringify(actionLabels));
  env.observationSchemaHash = hashString(
    JSON.stringify({
      version: env.observationSchemaVersion,
      layout: env.observationLayout
    })
  );

  return env;
}

function mapDecodedActionToMoves({ state, env, actorId, modeBefore, decoded }) {
  if (!decoded || decoded.type === "invalid") {
    return [];
  }

  if (decoded.type === "roll") {
    return [{ move: "rollDice", args: [] }];
  }

  if (decoded.type === "endTurn") {
    return [{ move: "endTurn", args: [] }];
  }

  if (decoded.type === "buyDevCard") {
    return [{ move: "buyDevCard", args: [] }];
  }

  if (decoded.type === "buildRoad") {
    if (modeBefore === "devRoadBuilding") {
      return [{ move: "placeRoadFromDevCard", args: [decoded.edgeId] }];
    }
    return [{ move: "placeRoad", args: [decoded.edgeId] }];
  }

  if (decoded.type === "settlement") {
    return [{ move: "placeSettlement", args: [decoded.nodeId] }];
  }

  if (decoded.type === "city") {
    return [{ move: "placeCity", args: [decoded.nodeId] }];
  }

  if (decoded.type === "trade") {
    const rate = bestTradeRate(
      state.G.core,
      state.G.coreTopology,
      actorId,
      decoded.give
    );
    return [
      {
        move: "maritimeTrade",
        args: [
          {
            give: Array.from({ length: rate }, () => decoded.give),
            receive: decoded.receive
          }
        ]
      }
    ];
  }

  if (decoded.type === "playKnight") {
    return [{ move: "playDevCardStart", args: ["knight"] }];
  }

  if (decoded.type === "playRoadBuilding") {
    return [{ move: "playDevCardStart", args: ["roadBuilding"] }];
  }

  if (decoded.type === "playMonopoly") {
    return [
      { move: "playDevCardStart", args: ["monopoly"] },
      { move: "confirmDevCardPlay", args: [decoded.resource] }
    ];
  }

  if (decoded.type === "playYearOfPlenty") {
    return [
      { move: "playDevCardStart", args: ["yearOfPlenty"] },
      { move: "confirmDevCardPlay", args: [decoded.resources] }
    ];
  }

  if (decoded.type === "robber") {
    return [{ move: "moveRobber", args: [decoded.tileId] }];
  }

  return [];
}

export function createPufferStateAdapter(state, options = {}) {
  const env = hydrateEnvFromMatchState(state, options);
  const spec = env.getSpec();
  const actorId = env._getActorId();
  const mode = env._getMode();
  const actionMask = env._computeActionMask(actorId);
  const actionLabels = spec.actionLabels;
  const observation = env.options.includeActionMaskInObservation
    ? env._buildBaseObservation(actorId).concat(actionMask)
    : env._buildBaseObservation(actorId);

  return {
    env,
    spec,
    actorId,
    mode,
    observation,
    actionMask,
    actionLabels,
    mapActionToMoves(actionId) {
      const decoded = env._decodeAction(actionId);
      return mapDecodedActionToMoves({
        state,
        env,
        actorId,
        modeBefore: mode,
        decoded
      });
    }
  };
}
