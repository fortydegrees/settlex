export const getVisibleDiceRoll = (G) => {
  if (!G?.core?.turn?.hasRolled) return null;
  if (!Array.isArray(G.diceRoll) || G.diceRoll.length < 2) return null;
  return G.diceRoll;
};

export function getDiscardRequirement({
  isGameOver,
  coreTurn,
  playerID,
  player
} = {}) {
  const needsToDiscard =
    !isGameOver && (coreTurn?.pendingDiscards?.includes(playerID) ?? false);
  const resourceCount = Array.isArray(player?.resources)
    ? player.resources.length
    : 0;

  return {
    needsToDiscard,
    discardCount: needsToDiscard ? Math.floor(resourceCount / 2) : 0
  };
}

export function getTurnCommandState({
  isGameOver,
  playerID,
  ctx,
  core,
  coreTurn
} = {}) {
  const isCurrentPlayer =
    playerID != null && String(ctx?.currentPlayer) === String(playerID);

  return {
    canRoll: Boolean(
      !isGameOver &&
        playerID &&
        isCurrentPlayer &&
        ctx?.activePlayers?.[playerID] === "preRoll" &&
        core?.phase === "normal" &&
        coreTurn?.phase === "preRoll"
    ),
    canEnd: Boolean(
      !isGameOver &&
        playerID &&
        isCurrentPlayer &&
        ctx?.activePlayers?.[playerID] === "postRoll" &&
        core?.phase === "normal" &&
        coreTurn?.hasRolled &&
        coreTurn?.phase === "postRoll" &&
        (coreTurn?.pendingDiscards?.length ?? 0) === 0
    )
  };
}

export function getHasBlockingModal({
  tradeModalVisible,
  needsToDiscard,
  devPlayModalVisible,
  showGameOverModal,
  showPostgame,
  showGameSettings,
  showGameRules
} = {}) {
  return Boolean(
    tradeModalVisible ||
      needsToDiscard ||
      devPlayModalVisible ||
      showGameOverModal ||
      showPostgame ||
      showGameSettings ||
      showGameRules
  );
}
