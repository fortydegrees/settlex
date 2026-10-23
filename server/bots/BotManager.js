import environment from "../../lib/config/environment.cjs";
const { readEnvironment } = environment;
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBotFallbackMove, getStagePlayers, resolveStageKey } from "../stagePolicy.js";
import { SettleGraphV2Client } from "./SettleGraphV2Client.js";
import { SettleGraphV2BotManager } from "./settleGraphV2BotManager.js";
import { getBotModelSelection } from "../../lib/server/bots/modelSelection.js";

const NATIVE_BOT_KEY = "settlegraph-v2";

function isNativeBot(seat) {
  return (seat?.data?.botKey ?? seat?.data?.bot) === NATIVE_BOT_KEY;
}

export class BotManager {
  constructor({ botPlayerIds = [], settleGraphV2Manager = null, logger = console } = {}) {
    this.botPlayerIds = new Set(botPlayerIds.map(String));
    this.settleGraphV2Manager = settleGraphV2Manager;
    this.logger = logger;
    this.matchBots = new Map();
  }

  isBotPlayer(playerID) {
    return this.botPlayerIds.has(String(playerID));
  }

  isBotPlayerForMatch(matchID, playerID) {
    return this.isBotPlayer(playerID) ||
      Boolean(this.matchBots.get(String(matchID))?.has(String(playerID)));
  }

  syncMatchBots(matchID, metadata) {
    const detected = new Set();
    for (const [playerID, seat] of Object.entries(metadata?.players ?? {})) {
      if (isNativeBot(seat)) detected.add(String(playerID));
    }
    this.matchBots.set(String(matchID), detected);
  }

  syncMatchBotsFromMatchData(matchID, matchData) {
    const detected = new Set();
    for (const seat of Array.isArray(matchData) ? matchData : []) {
      if (seat?.id == null) continue;
      if (isNativeBot(seat)) detected.add(String(seat.id));
    }
    this.matchBots.set(String(matchID), detected);
  }

  async chooseMoves(state, playerID, matchID = null) {
    const playerId = String(playerID);
    const isBot = matchID == null
      ? this.isBotPlayer(playerId)
      : this.isBotPlayerForMatch(matchID, playerId);
    if (!isBot) return [];

    const stageKey = resolveStageKey(state);
    if (stageKey === "preGame:waiting") return [{ move: "readyUp", args: [] }];
    const actors = getStagePlayers(state, stageKey);
    if (String(actors[0]) !== playerId) return [];
    if (stageKey === "main:devCardChoice") return [{ move: "autoResolveDevCard", args: [] }];

    if (this.settleGraphV2Manager) {
      try {
        return await this.settleGraphV2Manager.chooseMoves(state, playerId, matchID);
      } catch (error) {
        this.logger.warn?.(
          "SettleGraph inference failed; using stage fallback",
          { matchID, playerID: playerId, error }
        );
      }
    }
    return [{ move: getBotFallbackMove(state), args: [] }];
  }

  deleteMatch(matchID) {
    this.matchBots.delete(String(matchID));
  }

  close() {
    this.settleGraphV2Manager?.close();
  }
}

export function createBotManagerFromEnv({ logger = console } = {}) {
  const botPlayerIds = (readEnvironment(process.env, "SETTLEHEX_BOT_PLAYER_IDS") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  let settleGraphV2Manager = null;
  if (readEnvironment(process.env, "SETTLEHEX_SETTLEGRAPH_V2_ENABLED") === "1") {
    const fileDir = path.dirname(fileURLToPath(import.meta.url));
    const workerPath = readEnvironment(process.env, "SETTLEHEX_SETTLEGRAPH_V2_WORKER") ??
      path.resolve(fileDir, "../../native/settlegraph-v2/target/release/settlegraph-v2-worker");
    const client = new SettleGraphV2Client({
      workerPath,
      modelPath: getBotModelSelection().modelPath,
      expectedModel: getBotModelSelection(),
      workerCwd: readEnvironment(process.env, "SETTLEHEX_SETTLEGRAPH_V2_WORKER_CWD") ?? null,
      timeoutMs: readEnvironment(process.env, "SETTLEHEX_SETTLEGRAPH_V2_TIMEOUT_MS") ?? 3000,
      logger
    });
    settleGraphV2Manager = new SettleGraphV2BotManager({ client });
  }
  return new BotManager({ botPlayerIds, settleGraphV2Manager, logger });
}
