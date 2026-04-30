const DEV_PLAY_MODAL_STAGES = new Set(["devCardChoice"]);

function hasActiveTurnContext({ playerID, ctx, corePhase, isGameOver }) {
  if (isGameOver) {
    return false;
  }

  if (!playerID || !ctx) {
    return false;
  }

  if (ctx.phase !== "main" || corePhase !== "normal") {
    return false;
  }

  if (String(ctx.currentPlayer) !== String(playerID)) {
    return false;
  }

  return true;
}

function getViewerStage({ playerID, ctx }) {
  if (!playerID || !ctx) {
    return null;
  }

  return ctx.activePlayers?.[String(playerID)] ?? null;
}

export function shouldResetTradeModal({
  showTradeModal,
  playerID,
  ctx,
  corePhase,
  isGameOver
}) {
  if (!showTradeModal) {
    return false;
  }

  if (!hasActiveTurnContext({ playerID, ctx, corePhase, isGameOver })) {
    return true;
  }

  return getViewerStage({ playerID, ctx }) !== "postRoll";
}

export function canRenderDevPlayModal({
  devPlay,
  playerID,
  ctx,
  corePhase,
  isGameOver
}) {
  if (!devPlay || String(devPlay.playerId) !== String(playerID)) {
    return false;
  }

  if (!hasActiveTurnContext({ playerID, ctx, corePhase, isGameOver })) {
    return false;
  }

  return DEV_PLAY_MODAL_STAGES.has(getViewerStage({ playerID, ctx }));
}
