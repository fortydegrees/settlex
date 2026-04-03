const EXPLICIT_BUILD_ACTIONS = new Set([
  "placeRoad",
  "placeSettlement",
  "placeCity"
]);

export function isPassiveBuildEnabled({
  playerAction,
  playerID,
  ctx,
  corePhase,
  devCardPlay
}) {
  if (!playerID || !ctx) return false;
  if (EXPLICIT_BUILD_ACTIONS.has(playerAction)) return false;
  if (playerAction === "roadBuilding") return false;
  if (ctx.phase !== "main" || corePhase !== "normal") return false;
  if (String(ctx.currentPlayer) !== String(playerID)) return false;
  if (ctx.activePlayers?.[String(playerID)] !== "postRoll") return false;
  if (
    devCardPlay?.type === "roadBuilding" &&
    String(devCardPlay.playerId) === String(playerID)
  ) {
    return false;
  }
  return true;
}
