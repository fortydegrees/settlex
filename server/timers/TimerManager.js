const DEFAULT_STAGE_TIMERS_MS = {
  "preGame:waiting": 15000,
  "main:preRoll": 5000,
  "main:robberDiscard": 20000,
  "placement:settlement": 60000,
  "placement:road": 10000,
  "main:moveRobber": 20000,
  "main:roadBuilding": 10000,
  "main:devCardChoice": 20000
};

const DEFAULT_TURN_TIMER_MS = 45000;
const TURN_TIMER_KEYS = new Set(["main:postRoll"]);
const TURN_BONUS_MS = 10000;
const TURN_BONUS_CAP_MS = 30000;

const TURN_BONUS_MOVES = new Set([
  "maritimeTrade",
  "placeRoad",
  "placeSettlement",
  "placeCity",
  "buyDevCard",
  "playDevCardStart"
]);

const STAGE_TIMEOUT_MOVES = {
  "preGame:waiting": "autoStartGame",
  "main:preRoll": "autoRoll",
  "main:robberDiscard": "autoDiscard",
  "placement:settlement": "autoPlaceSettlement",
  "placement:road": "autoPlaceRoad",
  "main:moveRobber": "autoMoveRobber",
  "main:roadBuilding": "autoPlaceRoad",
  "main:devCardChoice": "autoResolveDevCard"
};

const BOT_ACTION_STAGE_KEYS = new Set([
  "placement:settlement",
  "placement:road",
  "main:preRoll",
  "main:postRoll",
  "main:moveRobber",
  "main:roadBuilding",
  "main:devCardChoice"
]);

const isResolvedState = (state) =>
  Boolean(state?.ctx?.gameover || state?.G?.core?.gameOver);

export class TimerManager {
  constructor({ dispatch, isBotPlayer, botMoveDelayMs = 400 }) {
    this.dispatch = dispatch;
    this.isBotPlayer = typeof isBotPlayer === "function" ? isBotPlayer : null;
    this.botMoveDelayMs = botMoveDelayMs;
    this.matches = new Map();
  }

  onState(matchID, state, deltalog) {
    const stageKey = this.getStageKey(state);
    const prev = this.matches.get(matchID) ?? {};
    const turnNumber = state.ctx.turn;
    const bonusMs = this.getTurnBonusMs(deltalog);

    if (isResolvedState(state)) {
      if (prev.stageTimeoutId) {
        clearTimeout(prev.stageTimeoutId);
        prev.stageTimeoutId = undefined;
      }
      if (prev.turnTimeoutId) {
        clearTimeout(prev.turnTimeoutId);
        prev.turnTimeoutId = undefined;
      }
      this.clearAllBotDispatches(prev);
      prev.stageStartedAtMs = undefined;
      prev.stageDurationMs = undefined;
      prev.turnStartedAtMs = undefined;
      prev.turnRemainingMs = null;
      prev.turnBonusMs = 0;
      prev.stageKey = stageKey;
      prev.turnNumber = turnNumber;
      this.matches.set(matchID, prev);
      return;
    }

    this.scheduleBotAction(matchID, state, prev, stageKey);

    if (prev.stageKey === stageKey && prev.turnNumber === turnNumber) {
      if (bonusMs > 0 && prev.turnRemainingMs != null) {
        if (prev.turnTimeoutId) {
          this.pauseTurnTimer(prev);
        }
        this.applyTurnBonus(prev, bonusMs);
        if (TURN_TIMER_KEYS.has(stageKey)) {
          this.startTurnTimer(matchID, state, prev);
        }
      }
      this.matches.set(matchID, prev);
      return;
    }

    if (prev.stageTimeoutId) {
      clearTimeout(prev.stageTimeoutId);
      prev.stageTimeoutId = undefined;
    }
    prev.stageStartedAtMs = undefined;
    prev.stageDurationMs = undefined;

    const stageTimeoutMs = DEFAULT_STAGE_TIMERS_MS[stageKey];
    const isTurnStage = TURN_TIMER_KEYS.has(stageKey);
    const turnChanged = prev.turnNumber !== undefined && prev.turnNumber !== turnNumber;

    if (prev.turnTimeoutId && !isTurnStage) {
      this.pauseTurnTimer(prev);
    }

    if (turnChanged) {
      this.resetTurnTimer(prev);
    }

    const stagePlayers =
      stageKey === "main:robberDiscard"
        ? [...(state.G?.core?.turn?.pendingDiscards ?? [])]
        : [state.ctx.currentPlayer];

    if (stageTimeoutMs && stagePlayers.length > 0) {
      const move = STAGE_TIMEOUT_MOVES[stageKey];
      prev.stageStartedAtMs = Date.now();
      prev.stageDurationMs = stageTimeoutMs;
      prev.stageTimeoutId = setTimeout(() => {
        const dispatchStage = async () => {
          for (const playerID of stagePlayers) {
            await this.dispatch({ matchID, move, playerID });
          }
        };
        void dispatchStage();
      }, stageTimeoutMs);
    } else {
      prev.stageStartedAtMs = undefined;
      prev.stageDurationMs = undefined;
    }

    if (isTurnStage) {
      if (prev.turnRemainingMs == null) {
        prev.turnRemainingMs = DEFAULT_TURN_TIMER_MS;
      }
      this.startTurnTimer(matchID, state, prev);
    }

    if (bonusMs > 0 && prev.turnRemainingMs != null) {
      if (prev.turnTimeoutId) {
        this.pauseTurnTimer(prev);
      }
      this.applyTurnBonus(prev, bonusMs);
      if (isTurnStage) {
        this.startTurnTimer(matchID, state, prev);
      }
    }

    prev.stageKey = stageKey;
    prev.turnNumber = turnNumber;
    this.matches.set(matchID, prev);
  }

  startTurnTimer(matchID, state, record, delayMs = 0) {
    if (record.turnTimeoutId) {
      clearTimeout(record.turnTimeoutId);
    }
    record.turnStartedAtMs = Date.now() + delayMs;
    const playerID = state.ctx.currentPlayer;
    record.turnTimeoutId = setTimeout(() => {
      this.dispatch({ matchID, move: "autoEndTurn", playerID });
    }, record.turnRemainingMs + delayMs);
  }

  pauseTurnTimer(record) {
    if (!record.turnTimeoutId) return;
    clearTimeout(record.turnTimeoutId);
    record.turnTimeoutId = undefined;
    const elapsed = Math.max(0, Date.now() - record.turnStartedAtMs);
    record.turnRemainingMs = Math.max(0, record.turnRemainingMs - elapsed);
    record.turnStartedAtMs = undefined;
  }

  resetTurnTimer(record) {
    if (record.turnTimeoutId) {
      clearTimeout(record.turnTimeoutId);
      record.turnTimeoutId = undefined;
    }
    record.turnRemainingMs = DEFAULT_TURN_TIMER_MS;
    record.turnStartedAtMs = undefined;
    record.turnBonusMs = 0;
  }

  applyTurnBonus(record, bonusMs) {
    if (record.turnRemainingMs == null) return;
    if (record.turnBonusMs == null) {
      record.turnBonusMs = 0;
    }
    const remainingCap = Math.max(0, TURN_BONUS_CAP_MS - record.turnBonusMs);
    const applied = Math.min(remainingCap, bonusMs);
    if (applied <= 0) return;
    record.turnRemainingMs += applied;
    record.turnBonusMs += applied;
  }

  getTurnBonusMs(deltalog) {
    if (!Array.isArray(deltalog)) return 0;
    const count = deltalog.filter((entry) => {
      if (entry?.action?.type !== "MAKE_MOVE") return false;
      return TURN_BONUS_MOVES.has(entry.action?.payload?.type);
    }).length;
    return count * TURN_BONUS_MS;
  }

  getTurnRemaining(matchID) {
    return this.matches.get(matchID)?.turnRemainingMs ?? null;
  }

  getStageRemainingMs(record) {
    if (!record.stageStartedAtMs || !record.stageDurationMs) return null;
    if (Date.now() < record.stageStartedAtMs) {
      return record.stageDurationMs;
    }
    const elapsed = Date.now() - record.stageStartedAtMs;
    return Math.max(0, record.stageDurationMs - elapsed);
  }

  getTurnRemainingMs(record) {
    if (record.turnRemainingMs == null) return null;
    if (!record.turnTimeoutId || !record.turnStartedAtMs) {
      return record.turnRemainingMs;
    }
    if (Date.now() < record.turnStartedAtMs) {
      return record.turnRemainingMs;
    }
    const elapsed = Date.now() - record.turnStartedAtMs;
    return Math.max(0, record.turnRemainingMs - elapsed);
  }

  getTimerSnapshot(matchID, state) {
    let record = this.matches.get(matchID);
    if (!record && state) {
      this.onState(matchID, state);
      record = this.matches.get(matchID);
    }
    if (!record) return null;
    const stageRemainingMs = this.getStageRemainingMs(record);
    if (stageRemainingMs != null) {
      return {
        kind: "stage",
        remainingMs: stageRemainingMs,
        totalMs: record.stageDurationMs,
        stageKey: record.stageKey
      };
    }
    const turnRemainingMs = this.getTurnRemainingMs(record);
    if (turnRemainingMs != null) {
      return {
        kind: "turn",
        remainingMs: turnRemainingMs,
        totalMs: record.turnRemainingMs,
        stageKey: record.stageKey
      };
    }
    return null;
  }


  getStageKey(state) {
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
    if (
      ctx.phase === "main" &&
      (devPlay?.type === "yearOfPlenty" || devPlay?.type === "monopoly") &&
      devPlay?.playerId === ctx.currentPlayer
    ) {
      return "main:devCardChoice";
    }
    return `${ctx.phase}:${stage}`;
  }

  clearBotDispatch(record, playerID) {
    const key = String(playerID);
    if (record.botTimeoutIds?.[key]) {
      clearTimeout(record.botTimeoutIds[key]);
      delete record.botTimeoutIds[key];
    }
    if (record.botDispatchKeys?.[key]) {
      delete record.botDispatchKeys[key];
    }
  }

  clearAllBotDispatches(record) {
    if (!record?.botTimeoutIds) {
      record.botTimeoutIds = {};
    }
    if (!record?.botDispatchKeys) {
      record.botDispatchKeys = {};
    }

    for (const key of Object.keys(record.botTimeoutIds)) {
      clearTimeout(record.botTimeoutIds[key]);
    }
    record.botTimeoutIds = {};
    record.botDispatchKeys = {};
  }

  scheduleBotDispatch(matchID, record, stage, stateID, playerID) {
    const key = String(playerID);
    const dispatchKey = `${stateID}:${stage}:${key}`;
    if (record.botDispatchKeys?.[key] === dispatchKey) {
      return;
    }

    if (!record.botTimeoutIds) {
      record.botTimeoutIds = {};
    }
    if (!record.botDispatchKeys) {
      record.botDispatchKeys = {};
    }

    if (record.botTimeoutIds[key]) {
      clearTimeout(record.botTimeoutIds[key]);
    }
    record.botDispatchKeys[key] = dispatchKey;
    record.botTimeoutIds[key] = setTimeout(() => {
      this.dispatch({ matchID, move: "autoBot", playerID: key });
    }, this.botMoveDelayMs);
  }

  scheduleBotAction(matchID, state, record, stageKey) {
    if (!this.isBotPlayer || !state) return;

    const stage = stageKey ?? this.getStageKey(state);
    const stateID = state._stateID ?? 0;

    if (stage === "preGame:waiting") {
      const readyByPlayerId = state.G?.preGame?.readyByPlayerId ?? {};
      const players = state.G?.core?.players ?? state.ctx?.playOrder ?? [];
      const targetPlayerIds = players
        .map((playerID) => String(playerID))
        .filter(
          (playerID) =>
            this.isBotPlayer({ matchID, playerID, state }) &&
            !readyByPlayerId[playerID]
        );

      if (targetPlayerIds.length === 0) {
        this.clearAllBotDispatches(record);
        return;
      }

      const target = new Set(targetPlayerIds);
      for (const scheduledPlayerId of Object.keys(record.botDispatchKeys ?? {})) {
        if (!target.has(scheduledPlayerId)) {
          this.clearBotDispatch(record, scheduledPlayerId);
        }
      }
      for (const targetPlayerId of targetPlayerIds) {
        this.scheduleBotDispatch(
          matchID,
          record,
          stage,
          stateID,
          targetPlayerId
        );
      }
      return;
    }

    const playerID = state.ctx?.currentPlayer;
    if (playerID == null) {
      this.clearAllBotDispatches(record);
      return;
    }

    const isBot = this.isBotPlayer({ matchID, playerID, state });
    const isBotStage = BOT_ACTION_STAGE_KEYS.has(stage);
    if (!isBot || !isBotStage) {
      this.clearAllBotDispatches(record);
      return;
    }

    this.clearAllBotDispatches(record);
    this.scheduleBotDispatch(matchID, record, stage, stateID, playerID);
  }
}
