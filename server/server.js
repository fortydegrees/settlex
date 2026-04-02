// src/server.js
import { Server, Origins, SocketIO } from "boardgame.io/dist/cjs/server.js"
import { ServerCatan } from "./serverGame.js"
import { TimerManager } from "./timers/TimerManager.js"
import { createTimerPubSub } from "./timers/timerPubSub.js"
import { DisconnectPresenceManager } from "./presence/DisconnectPresenceManager.js"
import { createPufferBotManagerFromEnv } from "./bots/pufferBotManager.js"
import { dispatchMatchUpdate } from "./dispatch/dispatchMatchUpdate.js"
const DEFAULT_BOT_MOVE_DELAY_MS = 450

let serverInstance
const botManager = createPufferBotManagerFromEnv()

const dispatch = async ({ matchID, move, playerID }) => {
  await dispatchMatchUpdate({
    serverInstance,
    botManager,
    move,
    playerID,
    matchID,
    game: ServerCatan
  })
}

const parsedBotDelay = Number(process.env.SETTLEX_BOT_MOVE_DELAY_MS)
const botMoveDelayMs = Number.isFinite(parsedBotDelay)
  ? parsedBotDelay
  : DEFAULT_BOT_MOVE_DELAY_MS

const timerManager = new TimerManager({
  dispatch,
  isBotPlayer: ({ matchID, playerID }) =>
    botManager.isBotPlayerForMatch(matchID, playerID),
  botMoveDelayMs
})
const disconnectManager = new DisconnectPresenceManager({ dispatch })
const pubSub = createTimerPubSub(timerManager, {
  botManager,
  disconnectManager,
  stateLoader: async (matchID) => {
    const response = await serverInstance?.db?.fetch(matchID, { state: true })
    return response?.state ?? null
  }
})
const transport = new SocketIO({ pubSub })

const server = Server({
  games: [ServerCatan],
  origins: [Origins.LOCALHOST_IN_DEVELOPMENT],
  transport,
})

serverInstance = server

server.router.get("/timer/:matchID", async (ctx) => {
  const matchID = ctx.params.matchID
  const { state } = await serverInstance.db.fetch(matchID, { state: true })
  if (!state) {
    ctx.status = 404
    ctx.body = { error: "match not found" }
    return
  }
  const timer = timerManager.getTimerSnapshot(matchID, state)
  ctx.body = { matchID, timer, serverTimeMs: Date.now() }
})

const lobbyConfig = {
  apiPort: 8080,
  apiCallback: () => console.log("Running Lobby API on port 8080..."),
}

server.run({ port: 8000, lobbyConfig })
