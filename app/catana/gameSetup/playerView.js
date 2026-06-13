const HIDDEN = "hidden";

const maskCards = (cards) => (cards || []).map(() => HIDDEN);

const cloneVisibleCards = (cards) => (Array.isArray(cards) ? [...cards] : cards);

const clonePlayerState = (playerState, isVisible) => {
  const cloned = { ...playerState };

  if (isVisible) {
    if (Array.isArray(playerState.resources)) {
      cloned.resources = cloneVisibleCards(playerState.resources);
    }
    if (Array.isArray(playerState.devCards)) {
      cloned.devCards = cloneVisibleCards(playerState.devCards);
    }
    if (Array.isArray(playerState.devCardsBoughtThisTurn)) {
      cloned.devCardsBoughtThisTurn = cloneVisibleCards(
        playerState.devCardsBoughtThisTurn
      );
    }
    return cloned;
  }

  cloned.resources = maskCards(playerState.resources);
  cloned.devCards = maskCards(playerState.devCards);
  cloned.devCardsBoughtThisTurn = maskCards(
    playerState.devCardsBoughtThisTurn
  );
  return cloned;
};

const maskPlayerStateById = (playerStateById, playerID) => {
  if (!playerStateById) return playerStateById;

  const masked = {};
  for (const [pid, playerState] of Object.entries(playerStateById)) {
    masked[pid] = clonePlayerState(playerState, pid === playerID);
  }
  return masked;
};

export const maskPlayerView = ({ G, ctx, playerID }) => {
  if (ctx.gameover || G.core?.gameOver) return G;

  const masked = { ...G };

  if (G.core) {
    masked.core = {
      ...G.core,
      playerStateById: maskPlayerStateById(G.core.playerStateById, playerID)
    };
  }

  if (Array.isArray(G.core?.devDeck)) {
    masked.core.devDeck = maskCards(G.core.devDeck);
  }

  if (G.diceState?.mode === "balanced") {
    masked.diceState = { mode: "balanced" };
  }

  return masked;
};
