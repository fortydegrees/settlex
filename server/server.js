// src/server.js
import { Server, Origins, SocketIO } from "boardgame.io/dist/cjs/server.js";
import { Master } from "boardgame.io/dist/cjs/master.js";
import { Catan } from "../app/catana/Game.js";
import { TimerManager } from "./timers/TimerManager.js";
import { buildAutoMoveAction } from "./timers/dispatchUtils.js";
import { createTimerPubSub } from "./timers/timerPubSub.js";


const MATCH_PREFIX = "MATCH-";

let serverInstance;

const dispatch = async ({ matchID, move, playerID }) => {
  if (!serverInstance || !move) return;

  const { state, metadata } = await serverInstance.db.fetch(matchID, {
    state: true,
    metadata: true
  });
  if (!state) return;

  const action = buildAutoMoveAction({ move, playerID, metadata });

  const transportAPI = {
    send: () => {},
    sendAll: (payload) => {
      serverInstance.transport.pubSub.publish(`${MATCH_PREFIX}${matchID}`, payload);
    }
  };

  const master = new Master(Catan, serverInstance.db, transportAPI, serverInstance.auth);
  await master.onUpdate(action, state._stateID, matchID, playerID);
};

const timerManager = new TimerManager({ dispatch });
const pubSub = createTimerPubSub(timerManager);
const transport = new SocketIO({ pubSub });

const server = Server({
  games: [Catan],
  origins: [Origins.LOCALHOST_IN_DEVELOPMENT],
  transport
});

serverInstance = server;


server.router.get("/timer/:matchID", async (ctx) => {
  const matchID = ctx.params.matchID;
  const { state } = await serverInstance.db.fetch(matchID, { state: true });
  if (!state) {
    ctx.status = 404;
    ctx.body = { error: "match not found" };
    return;
  }
  const timer = timerManager.getTimerSnapshot(matchID, state);
  ctx.body = { matchID, timer, serverTimeMs: Date.now() };
});

const lobbyConfig = {
  apiPort: 8080,
  apiCallback: () => console.log("Running Lobby API on port 8080...")
};

server.run({ port: 8000, lobbyConfig });
