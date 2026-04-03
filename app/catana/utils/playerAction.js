const BUILD_ACTIONS = new Set(["placeRoad", "placeSettlement", "placeCity"]);
const BUILD_PICKUP_PIECE_BY_ACTION = {
  placeRoad: "road",
  placeSettlement: "settlement",
  placeCity: "city"
};

export function getBuildPickupPieceType(playerAction) {
  return BUILD_PICKUP_PIECE_BY_ACTION[playerAction] ?? null;
}

export function shouldResetPlayerAction({
  playerAction,
  playerID,
  ctx,
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

  return false;
}
