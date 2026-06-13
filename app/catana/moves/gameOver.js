import { appendGameLog } from "../utils/gameLog.js";

export const GAME_OVER_REASONS = {
  RESIGNATION: "Resignation",
  DISCONNECT_FORFEIT: "Disconnect Forfeit",
  AFK_FORFEIT: "AFK Forfeit"
};

export const maybeLogGameOver = (G, ctx) => {
  if (!G?.core?.gameOver || G.gameOverLogged) return;
  const { winnerId, reason } = G.core.gameOver;
  appendGameLog(G, ctx, {
    type: "game:over",
    actorId: winnerId ?? "system",
    data: { winnerId, reason }
  });
  G.gameOverLogged = true;
};
