const BUILD_ACTIONS = new Set(["placeRoad", "placeSettlement", "placeCity"]);

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
