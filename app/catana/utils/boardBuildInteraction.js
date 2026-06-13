import {
  buildableNodes,
  canBuildCity as coreCanBuildCity,
  canBuildRoad as coreCanBuildRoad,
  canBuildSettlement as coreCanBuildSettlement
} from "@settlex/game-core";
import { getBuildableEdges } from "../moves/buildMoves";
import { isPassiveBuildEnabled } from "./passiveBuildMode";

const emptyPassiveTargets = (passiveBuildEnabled) => ({
  passiveBuildEnabled,
  passiveBuildableEdges: [],
  passiveSettlementNodes: [],
  passiveCityNodes: []
});

export function getBoardInteractionState({ ctx, playerID } = {}) {
  const normalizedPlayerId = playerID == null ? null : String(playerID);
  const playerStage =
    normalizedPlayerId == null
      ? null
      : ctx?.activePlayers?.[normalizedPlayerId] ?? null;
  const isCurrentPlayerPerspective =
    normalizedPlayerId != null && String(ctx?.currentPlayer) === normalizedPlayerId;
  const isInteractiveStageOwner = isCurrentPlayerPerspective && playerStage != null;

  return {
    playerStage,
    isCurrentPlayerPerspective,
    isInteractiveStageOwner,
    isPlacementSettlementStage:
      ctx?.phase === "placement" && playerStage === "settlement",
    isPlacementRoadStage: ctx?.phase === "placement" && playerStage === "road"
  };
}

export function getOwnedSettlementNodeIds(core, playerID) {
  if (!core || playerID == null) return [];
  const normalizedPlayerId = String(playerID);

  return Object.entries(core.buildingsByNodeId ?? {}).flatMap(
    ([nodeId, building]) =>
      String(building.ownerId) === normalizedPlayerId &&
      building.type === "settlement"
        ? [Number(nodeId)]
        : []
  );
}

export function getMainBuildableNodes({
  G,
  ctx,
  playerID,
  playerAction,
  isCurrentPlayerPerspective
} = {}) {
  if (!G?.core || !playerID || !isCurrentPlayerPerspective) {
    return [];
  }

  if (playerAction === "placeSettlement") {
    if (!G.coreTopology) return [];
    return buildableNodes(G.core, G.coreTopology, playerID, {
      initialPlacement: ctx?.phase === "placement"
    });
  }

  if (playerAction === "placeCity") {
    return getOwnedSettlementNodeIds(G.core, playerID);
  }

  return [];
}

export function getExplicitBuildableRoads({
  G,
  ctx,
  playerID,
  playerAction,
  isCurrentPlayerPerspective
} = {}) {
  if (
    !playerID ||
    !isCurrentPlayerPerspective ||
    (playerAction !== "placeRoad" && playerAction !== "roadBuilding") ||
    !G?.core ||
    !G?.coreTopology
  ) {
    return [];
  }

  return getBuildableEdges(playerID, G, ctx);
}

export function getPassiveBuildTargets({
  G,
  ctx,
  playerID,
  playerAction
} = {}) {
  const passiveBuildEnabled = isPassiveBuildEnabled({
    playerAction,
    playerID,
    ctx,
    corePhase: G?.core?.phase,
    devCardPlay: G?.devCardPlay
  });

  if (!passiveBuildEnabled || !playerID || !G?.core) {
    return emptyPassiveTargets(passiveBuildEnabled);
  }

  const hasTopology = Boolean(G.coreTopology);
  const passiveBuildableEdges = hasTopology && coreCanBuildRoad(G.core, playerID).ok
    ? getBuildableEdges(playerID, G, ctx)
    : [];
  const passiveSettlementNodes = hasTopology && coreCanBuildSettlement(G.core, playerID).ok
    ? buildableNodes(G.core, G.coreTopology, playerID, {
        initialPlacement: false
      })
    : [];
  const passiveCityNodes = coreCanBuildCity(G.core, playerID).ok
    ? getOwnedSettlementNodeIds(G.core, playerID)
    : [];

  return {
    passiveBuildEnabled,
    passiveBuildableEdges,
    passiveSettlementNodes,
    passiveCityNodes
  };
}
