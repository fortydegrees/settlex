// src/server.js
const { Server, Origins, SocketIO } = require("boardgame.io/server");
const { Master } = require("boardgame.io/master");
const { Catan } = require("../app/catana/Game");
const { TimerManager } = require("./timers/TimerManager");
const { createTimerPubSub } = require("./timers/timerPubSub");

const MATCH_PREFIX = "MATCH-";

let serverInstance;

const dispatch = async ({ matchID, move, playerID }) => {
  if (!serverInstance || !move) return;

  const { state } = await serverInstance.db.fetch(matchID, { state: true });
  if (!state) return;

  const action = {
    type: "MAKE_MOVE",
    payload: { type: move, args: [], playerID, credentials: null }
  };

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

const lobbyConfig = {
  apiPort: 8080,
  apiCallback: () => console.log("Running Lobby API on port 8080...")
};

server.run({ port: 8000, lobbyConfig });
