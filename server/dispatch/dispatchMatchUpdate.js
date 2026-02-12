import { Master } from "boardgame.io/dist/cjs/master.js";
import { buildAutoMoveAction } from "../timers/dispatchUtils.js";

const MATCH_PREFIX = "MATCH-";

const buildTransportAPI = (serverInstance, matchID) => ({
  send: () => {},
  sendAll: (payload) => {
    serverInstance.transport.pubSub.publish(`${MATCH_PREFIX}${matchID}`, payload);
  }
});

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
      if (!planned?.move) break;
      const action = buildAutoMoveAction({
        move: planned.move,
        args: planned.args ?? [],
        playerID,
        metadata
      });
      await master.onUpdate(action, stateId, matchID, playerID);
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
