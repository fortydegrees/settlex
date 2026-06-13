import { appendGameLog } from "../utils/gameLog.js";
import { GAME_OVER_REASONS, maybeLogGameOver } from "./gameOver.js";

const getOpponentWinnerId = (G, losingPlayerId) => {
  const playerIds = G?.core?.players?.map(String) ?? [];
  return playerIds.find((playerId) => playerId !== String(losingPlayerId)) ?? null;
};

const resolveTerminalForfeit = (
  context,
  losingPlayerId,
  reason,
  { serverLogType = null } = {}
) => {
  const { G, ctx, events } = context;
  if (!G?.core || G.core.gameOver || losingPlayerId == null) {
    return;
  }

  const winnerId = getOpponentWinnerId(G, losingPlayerId);
  if (winnerId == null) {
    return;
  }

  const gameOver = { winnerId, reason };
  if (serverLogType) {
    appendGameLog(G, ctx, {
      type: serverLogType,
      actorId: "system",
      data: {
        playerId: String(losingPlayerId),
        winnerId
      }
    });
  }
  G.core.gameOver = gameOver;
  maybeLogGameOver(G, ctx);
  events?.endGame?.(gameOver);
};

export const resign = {
  move: (context, losingPlayerIdArg) => {
    const losingPlayerId =
      losingPlayerIdArg ?? context.playerID ?? context.ctx?.currentPlayer;
    resolveTerminalForfeit(
      context,
      losingPlayerId,
      GAME_OVER_REASONS.RESIGNATION,
      { serverLogType: "server:resign" }
    );
  }
};

export const resolveDisconnectForfeit = {
  client: false,
  move: (context, losingPlayerIdArg) => {
    resolveTerminalForfeit(
      context,
      losingPlayerIdArg ?? context.playerID,
      GAME_OVER_REASONS.DISCONNECT_FORFEIT
    );
  }
};

export const resolveIdleForfeit = {
  client: false,
  move: (context, losingPlayerIdArg) => {
    resolveTerminalForfeit(
      context,
      losingPlayerIdArg ?? context.playerID,
      GAME_OVER_REASONS.AFK_FORFEIT
    );
  }
};
