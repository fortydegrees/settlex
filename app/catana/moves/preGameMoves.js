export const readyUp = {
  ignoreStaleStateID: true,
  move: (context) => {
    const { G, ctx, playerID, events } = context;
    if (!playerID) return;
    if (!G.preGame) {
      G.preGame = { readyByPlayerId: {} };
    }
    G.preGame.readyByPlayerId[playerID] = true;

    const allPlayers = G.core?.players ?? ctx.playOrder ?? [];
    if (!Array.isArray(allPlayers) || allPlayers.length === 0) {
      return;
    }
    const allReady = allPlayers.every(
      (id) => G.preGame.readyByPlayerId?.[id]
    );
    if (allReady) {
      events.endPhase();
    }
  }
};

export const autoStartGame = {
  move: (context) => {
    const { events } = context;
    events.endPhase();
  }
};
