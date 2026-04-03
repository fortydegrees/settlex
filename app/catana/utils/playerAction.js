import {
  buildableEdges,
  buildableNodes,
  canBuildCity,
  canBuildRoad,
  canBuildSettlement
} from "@settlex/game-core";

const BUILD_ACTIONS = new Set(["placeRoad", "placeSettlement", "placeCity"]);
const BUILD_PICKUP_PIECE_BY_ACTION = {
  placeRoad: "road",
  placeSettlement: "settlement",
  placeCity: "city"
};

export function getBuildPickupPieceType(playerAction) {
  return BUILD_PICKUP_PIECE_BY_ACTION[playerAction] ?? null;
}

export function canKeepBuildAction({
  playerAction,
  playerID,
  core,
  coreTopology
}) {
  if (!BUILD_ACTIONS.has(playerAction)) {
    return true;
  }

  if (!core || !coreTopology || playerID == null) {
    return false;
  }

  const normalizedPlayerId = String(playerID);

  switch (playerAction) {
    case "placeRoad":
      return (
        canBuildRoad(core, normalizedPlayerId).ok &&
        buildableEdges(core, coreTopology, normalizedPlayerId, {
          initialPlacement: false
        }).length > 0
      );
    case "placeSettlement":
      return (
        canBuildSettlement(core, normalizedPlayerId).ok &&
        buildableNodes(core, coreTopology, normalizedPlayerId, {
          initialPlacement: false
        }).length > 0
      );
    case "placeCity":
      return (
        canBuildCity(core, normalizedPlayerId).ok &&
        Object.values(core.buildingsByNodeId ?? {}).some(
          (building) =>
            building.ownerId === normalizedPlayerId &&
            building.type === "settlement"
        )
      );
    default:
      return true;
  }
}

export function shouldResetPlayerAction({
  playerAction,
  playerID,
  ctx,
  core,
  coreTopology,
  corePhase,
  isGameOver
}) {
  if (!BUILD_ACTIONS.has(playerAction)) {
    return false;
  }

  if (isGameOver) {
    return true;
  }

  if (!playerID || !ctx) {
    return true;
  }

  if (ctx.phase !== "main" || corePhase !== "normal") {
    return true;
  }

  if (String(ctx.currentPlayer) !== String(playerID)) {
    return true;
  }

  if (ctx.activePlayers?.[String(playerID)] !== "postRoll") {
    return true;
  }

  if (
    !canKeepBuildAction({
      playerAction,
      playerID,
      core,
      coreTopology
    })
  ) {
    return true;
  }

  return false;
}
