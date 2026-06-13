const HIDDEN = "hidden";

export const maskPlayerView = ({ G, ctx, playerID }) => {
  if (ctx.gameover || G.core?.gameOver) return G;

  const masked = JSON.parse(JSON.stringify(G));

  if (masked.core?.devDeck) {
    masked.core.devDeck = masked.core.devDeck.map(() => HIDDEN);
  }

  if (masked.core?.playerStateById) {
    for (const pid of Object.keys(masked.core.playerStateById)) {
      if (pid !== playerID) {
        const ps = masked.core.playerStateById[pid];
        ps.resources = (ps.resources || []).map(() => HIDDEN);
        ps.devCards = (ps.devCards || []).map(() => HIDDEN);
        ps.devCardsBoughtThisTurn = (ps.devCardsBoughtThisTurn || []).map(
          () => HIDDEN
        );
      }
    }
  }

  if (masked.diceState?.mode === "balanced") {
    masked.diceState = { mode: "balanced" };
  }

  return masked;
};
