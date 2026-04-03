import { Master } from "boardgame.io/dist/cjs/master.js";
import { buildAutoMoveAction } from "../timers/dispatchUtils.js";

const MATCH_PREFIX = "MATCH-";
const TARGETED_SERVER_MOVES = new Set([
  "resolveDisconnectForfeit",
  "resolveIdleForfeit"
]);

const buildTransportAPI = (serverInstance, matchID) => ({
  send: () => {},
  sendAll: (payload) => {
    serverInstance.transport.pubSub.publish(`${MATCH_PREFIX}${matchID}`, payload);
  }
});

const getActiveDispatchPlayerID = (state, fallbackPlayerID) => {
  const activePlayers = state?.ctx?.activePlayers ?? null;
  const currentPlayer =
    state?.ctx?.currentPlayer == null ? null : String(state.ctx.currentPlayer);

  if (activePlayers) {
    if (currentPlayer && activePlayers[currentPlayer] != null) {
      return currentPlayer;
    }

    const stagedPlayerID = Object.entries(activePlayers).find(
      ([, stage]) => stage != null
    )?.[0];
    if (stagedPlayerID != null) {
      return String(stagedPlayerID);
    }

    if (currentPlayer && activePlayers[currentPlayer] !== undefined) {
      return currentPlayer;
    }

    const firstActivePlayerID = Object.keys(activePlayers)[0];
    if (firstActivePlayerID != null) {
      return String(firstActivePlayerID);
    }
  }

  if (currentPlayer != null) {
    return currentPlayer;
  }

  return fallbackPlayerID == null ? null : String(fallbackPlayerID);
};

const resolvePlannedDispatch = ({ planned, playerID, state }) => {
  if (!planned?.move) {
    return null;
  }

  const targetPlayerID = playerID == null ? null : String(playerID);
  const plannedArgs = Array.isArray(planned.args) ? planned.args : [];

  if (TARGETED_SERVER_MOVES.has(planned.move)) {
    return {
      move: planned.move,
      playerID: getActiveDispatchPlayerID(state, targetPlayerID),
      args: plannedArgs.length > 0 ? plannedArgs : [targetPlayerID]
    };
  }

  return {
    move: planned.move,
    playerID: targetPlayerID,
    args: plannedArgs
  };
};

export async function dispatchMatchUpdate({
  serverInstance,
  botManager,
  move,
  playerID,
  matchID,
  game,
  MasterClass = Master,
  logger = console
}) {
  if (!serverInstance || !move) return;

  let state = null;
  let metadata = null;
  try {
    const initial = await serverInstance.db.fetch(matchID, {
      state: true,
      metadata: true
    });
    state = initial?.state ?? null;
    metadata = initial?.metadata ?? null;
    if (!state) return;

    botManager.syncMatchBots(matchID, metadata);

    const master = new MasterClass(
      game,
      serverInstance.db,
      buildTransportAPI(serverInstance, matchID),
      serverInstance.auth
    );

    let plannedMoves = [{ move, args: [] }];
    if (move === "autoBot" && botManager.isBotPlayerForMatch(matchID, playerID)) {
      plannedMoves = await botManager.chooseMoves(state, playerID, matchID);
    }

    let stateId = state._stateID;
    for (const planned of plannedMoves) {
      const resolved = resolvePlannedDispatch({ planned, playerID, state });
      if (!resolved?.move || resolved.playerID == null) break;
      const action = buildAutoMoveAction({
        move: resolved.move,
        args: resolved.args,
        playerID: resolved.playerID,
        metadata
      });
      const result = await master.onUpdate(
        action,
        stateId,
        matchID,
        resolved.playerID
      );
      if (result?.error) {
        logger.error("dispatchMatchUpdate rejected action", {
          matchID,
          move: resolved.move,
          playerID: resolved.playerID,
          error: result.error
        });
        break;
      }
      stateId += 1;
    }

    const latest = await serverInstance.db.fetch(matchID, {
      state: true,
      metadata: true
    });
    if (latest?.metadata) {
      botManager.syncMatchBots(matchID, latest.metadata);
    }
  } catch (error) {
    logger.error("dispatchMatchUpdate failed", {
      matchID,
      move,
      playerID,
      error
    });
  }
}
