import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPufferBotManagerFromEnv } from "./pufferBotManager.js";
import { SettleGraphV2Client } from "./SettleGraphV2Client.js";
import { SettleGraphV2BotManager } from "./settleGraphV2BotManager.js";

export const BOT_KEYS = Object.freeze({
  PUFFER: "puffer",
  SETTLEGRAPH_V2: "settlegraph-v2"
});

function normalizedBotKey(seat) {
  const explicit = String(seat?.data?.botKey ?? seat?.data?.bot ?? "")
    .trim()
    .toLowerCase();
  if (explicit === BOT_KEYS.SETTLEGRAPH_V2) return BOT_KEYS.SETTLEGRAPH_V2;
  if (explicit === BOT_KEYS.PUFFER || explicit === "bot") return BOT_KEYS.PUFFER;
  const name = String(seat?.name ?? "").trim().toLowerCase();
  if (seat?.data?.isBot === true || name.startsWith("[bot]") || name.includes("puffer")) {
    return BOT_KEYS.PUFFER;
  }
  return null;
}

export class BotManager {
  constructor({ pufferManager, settleGraphV2Manager = null, logger = console }) {
    this.pufferManager = pufferManager;
    this.settleGraphV2Manager = settleGraphV2Manager;
    this.logger = logger;
    this.matchBots = new Map();
  }

  isBotPlayer(playerID) {
    return this.pufferManager.isBotPlayer(playerID);
  }

  isBotPlayerForMatch(matchID, playerID) {
    return this.matchBots.get(String(matchID))?.has(String(playerID)) ||
      this.pufferManager.isBotPlayerForMatch?.(matchID, playerID) ||
      this.pufferManager.isBotPlayer(playerID);
  }

  syncMatchBots(matchID, metadata) {
    this.pufferManager.syncMatchBots?.(matchID, metadata);
    const detected = new Map();
    for (const [playerID, seat] of Object.entries(metadata?.players ?? {})) {
      const botKey = normalizedBotKey(seat);
      if (botKey) detected.set(String(playerID), botKey);
    }
    this.matchBots.set(String(matchID), detected);
  }

  syncMatchBotsFromMatchData(matchID, matchData) {
    this.pufferManager.syncMatchBotsFromMatchData?.(matchID, matchData);
    const detected = new Map();
    for (const seat of Array.isArray(matchData) ? matchData : []) {
      if (seat?.id == null) continue;
      const botKey = normalizedBotKey(seat);
      if (botKey) detected.set(String(seat.id), botKey);
    }
    this.matchBots.set(String(matchID), detected);
  }

  async chooseMoves(state, playerID, matchID = null) {
    const playerId = String(playerID);
    const botKey = matchID == null
      ? (this.pufferManager.isBotPlayer(playerId) ? BOT_KEYS.PUFFER : null)
      : this.matchBots.get(String(matchID))?.get(playerId);
    if (!botKey) return [];

    if (botKey === BOT_KEYS.SETTLEGRAPH_V2 && this.settleGraphV2Manager) {
      try {
        return await this.settleGraphV2Manager.chooseMoves(state, playerId, matchID);
      } catch (error) {
        this.logger.warn?.(
          "SettleGraph V2 inference failed; using Puffer fallback",
          { matchID, playerID: playerId, error }
        );
      }
    }
    return this.pufferManager.chooseMoves(state, playerId, matchID);
  }

  getFallbackMove(state) {
    return this.pufferManager.getFallbackMove(state);
  }

  deleteMatch(matchID) {
    this.matchBots.delete(String(matchID));
    this.pufferManager.deleteMatch?.(matchID);
  }

  close() {
    this.settleGraphV2Manager?.close();
    this.pufferManager.close();
  }
}

export function createBotManagerFromEnv({ logger = console } = {}) {
  const pufferManager = createPufferBotManagerFromEnv();
  let settleGraphV2Manager = null;
  if (process.env.SETTLEX_SETTLEGRAPH_V2_ENABLED === "1") {
    const fileDir = path.dirname(fileURLToPath(import.meta.url));
    const workerPath = process.env.SETTLEX_SETTLEGRAPH_V2_WORKER ??
      path.resolve(fileDir, "../../native/settlegraph-v2/target/release/settlegraph-v2-worker");
    const client = new SettleGraphV2Client({
      workerPath,
      modelPath: process.env.SETTLEX_SETTLEGRAPH_V2_MODEL ?? null,
      workerCwd: process.env.SETTLEX_SETTLEGRAPH_V2_WORKER_CWD ?? null,
      timeoutMs: process.env.SETTLEX_SETTLEGRAPH_V2_TIMEOUT_MS ?? 3000,
      logger
    });
    settleGraphV2Manager = new SettleGraphV2BotManager({ client });
  }
  return new BotManager({ pufferManager, settleGraphV2Manager, logger });
}
