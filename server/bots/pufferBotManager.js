import path from "node:path";
import { fileURLToPath } from "node:url";
import { PufferPolicyClient } from "./PufferPolicyClient.js";
import { createPufferStateAdapter } from "./pufferStateAdapter.js";
import { chooseActionWithExpectimax } from "./pufferSearch.js";

const STAGE_FALLBACK_MOVES = {
  "preGame:waiting": "readyUp",
  "main:preRoll": "autoRoll",
  "main:robberDiscard": "autoDiscard",
  "placement:settlement": "autoPlaceSettlement",
  "placement:road": "autoPlaceRoad",
  "main:moveRobber": "autoMoveRobber",
  "main:roadBuilding": "autoPlaceRoad",
  "main:postRoll": "autoEndTurn"
};

function getStageKey(state) {
  const { ctx, G } = state;
  const active =
    ctx.activePlayers?.[ctx.currentPlayer] ?? ctx.activePlayers?.all ?? "";
  const stage = typeof active === "string" ? active : active?.stage ?? "";
  const devPlay = G?.devCardPlay;
  const coreTurn = G?.core?.turn;

  if (
    ctx.phase === "main" &&
    (coreTurn?.phase === "robberDiscard" ||
      (coreTurn?.pendingDiscards?.length ?? 0) > 0)
  ) {
    return "main:robberDiscard";
  }
  if (
    ctx.phase === "main" &&
    devPlay?.type === "roadBuilding" &&
    devPlay?.pendingRoads > 0 &&
    devPlay?.playerId === ctx.currentPlayer
  ) {
    return "main:roadBuilding";
  }
  return `${ctx.phase}:${stage}`;
}

function randomLegalAction(mask, rng = Math.random) {
  const legal = [];
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === 1) legal.push(i);
  }
  if (legal.length === 0) return -1;
  const index = Math.floor(rng() * legal.length);
  return legal[index];
}

function parseBotPlayerIds(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function seatLooksLikeBot(seat) {
  const name = String(seat?.name ?? "").trim().toLowerCase();
  const dataBot = String(seat?.data?.bot ?? "").trim().toLowerCase();
  const hasBotFlag =
    seat?.data?.isBot === true ||
    dataBot === "puffer" ||
    dataBot === "bot";
  const hasBotName =
    name.startsWith("[bot]") ||
    name.includes("puffer bot") ||
    name.includes("puffer");

  return hasBotFlag || hasBotName;
}

export class PufferBotManager {
  constructor({
    checkpointPath = null,
    pythonExecutable = "python3",
    pythonCwd = null,
    stochastic = false,
    botPlayerIds = [],
    search = "off",
    searchBudgetMs = 250,
    searchTopK = 12,
    searchMaxDepth = 2
  } = {}) {
    this.botPlayerIds = new Set(botPlayerIds.map((id) => String(id)));
    this.matchBotPlayerIds = new Map();
    this.policyDisabled = false;
    this.search = String(search || "off");
    this.searchBudgetMs = Math.max(25, Number(searchBudgetMs) || 250);
    this.searchTopK = Math.max(1, Number(searchTopK) || 12);
    this.searchMaxDepth = Math.max(1, Number(searchMaxDepth) || 2);

    if (checkpointPath) {
      const fileDir = path.dirname(fileURLToPath(import.meta.url));
      const defaultPythonCwd = path.resolve(fileDir, "../../ai/pufferlib/python");
      this.policyClient = new PufferPolicyClient({
        checkpointPath,
        pythonExecutable,
        pythonCwd: pythonCwd ?? defaultPythonCwd,
        stochastic
      });
    } else {
      this.policyClient = null;
    }
  }

  isBotPlayer(playerID) {
    return this.botPlayerIds.has(String(playerID));
  }

  isBotPlayerForMatch(matchID, playerID) {
    if (this.isBotPlayer(playerID)) {
      return true;
    }
    const dynamic = this.matchBotPlayerIds.get(String(matchID));
    return Boolean(dynamic?.has(String(playerID)));
  }

  syncMatchBots(matchID, metadata) {
    const detected = new Set();
    for (const [playerID, seat] of Object.entries(metadata?.players ?? {})) {
      if (seatLooksLikeBot(seat)) {
        detected.add(String(playerID));
      }
    }
    this.matchBotPlayerIds.set(String(matchID), detected);
  }

  syncMatchBotsFromMatchData(matchID, matchData) {
    const detected = new Set();
    for (const seat of Array.isArray(matchData) ? matchData : []) {
      if (seat?.id == null || !seatLooksLikeBot(seat)) continue;
      detected.add(String(seat.id));
    }
    this.matchBotPlayerIds.set(String(matchID), detected);
  }

  getFallbackMove(state) {
    const stageKey = getStageKey(state);
    return STAGE_FALLBACK_MOVES[stageKey] ?? "autoEndTurn";
  }

  async chooseMoves(state, playerID, matchID = null) {
    const isBot = matchID == null
      ? this.isBotPlayer(playerID)
      : this.isBotPlayerForMatch(matchID, playerID);
    if (!isBot) {
      return [];
    }

    const stageKey = getStageKey(state);
    if (stageKey === "preGame:waiting") {
      return [{ move: "readyUp", args: [] }];
    }

    if (state?.ctx?.currentPlayer !== String(playerID)) {
      return [];
    }

    if (stageKey === "main:robberDiscard") {
      return [{ move: "autoDiscard", args: [] }];
    }

    let adapter;
    try {
      adapter = createPufferStateAdapter(state);
    } catch (error) {
      return [{ move: this.getFallbackMove(state), args: [] }];
    }

    if (adapter.actorId !== String(playerID)) {
      return [{ move: this.getFallbackMove(state), args: [] }];
    }

    const legalCount = adapter.actionMask.reduce((sum, value) => sum + value, 0);
    if (legalCount <= 0) {
      return [{ move: this.getFallbackMove(state), args: [] }];
    }

    let actionId = -1;
    if (this.policyClient && !this.policyDisabled) {
      try {
        if (this.search === "expectimax") {
          const searchResult = await chooseActionWithExpectimax({
            adapter,
            policyClient: this.policyClient,
            playerID,
            budgetMs: this.searchBudgetMs,
            topK: this.searchTopK,
            maxDepth: this.searchMaxDepth
          });
          if (searchResult?.meta) {
            console.info(
              `[puffer-search] nodes=${searchResult.meta.nodesExpanded} timedOut=${searchResult.meta.timedOut} value=${searchResult.meta.bestValue.toFixed(3)}`
            );
          }
          actionId = Number.isInteger(searchResult?.actionId) ? searchResult.actionId : -1;
        }

        if (!Number.isInteger(actionId) || actionId < 0) {
          actionId = await this.policyClient.infer({
            observation: adapter.observation,
            actionMask: adapter.actionMask,
            spec: adapter.spec
          });
        }
      } catch (error) {
        console.warn(`[puffer-policy] falling back to random legal action: ${error}`);
        this.policyDisabled = true;
      }
    }

    if (!Number.isInteger(actionId) || adapter.actionMask[actionId] !== 1) {
      actionId = randomLegalAction(adapter.actionMask);
    }
    if (!Number.isInteger(actionId) || actionId < 0) {
      return [{ move: this.getFallbackMove(state), args: [] }];
    }

    const planned = adapter.mapActionToMoves(actionId);
    if (!Array.isArray(planned) || planned.length === 0) {
      return [{ move: this.getFallbackMove(state), args: [] }];
    }
    return planned;
  }

  close() {
    this.policyClient?.close();
  }
}

export function createPufferBotManagerFromEnv() {
  const botPlayerIds = parseBotPlayerIds(process.env.SETTLEX_BOT_PLAYER_IDS);
  return new PufferBotManager({
    checkpointPath: process.env.SETTLEX_PUFFER_CHECKPOINT ?? null,
    pythonExecutable:
      process.env.SETTLEX_PUFFER_PYTHON ??
      process.env.PYTHON ??
      "python3",
    pythonCwd: process.env.SETTLEX_PUFFER_PYTHON_CWD ?? null,
    stochastic: process.env.SETTLEX_PUFFER_STOCHASTIC === "1",
    search: process.env.SETTLEX_PUFFER_SEARCH ?? "off",
    searchBudgetMs: process.env.SETTLEX_PUFFER_SEARCH_BUDGET_MS ?? 250,
    searchTopK: process.env.SETTLEX_PUFFER_SEARCH_TOPK ?? 12,
    searchMaxDepth: process.env.SETTLEX_PUFFER_SEARCH_MAX_DEPTH ?? 2,
    botPlayerIds
  });
}
