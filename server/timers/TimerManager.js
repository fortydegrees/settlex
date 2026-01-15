const DEFAULT_STAGE_TIMERS_MS = {
  "main:preRoll": 5000,
  "main:robberDiscard": 20000,
  "placement:settlement": 60000,
  "placement:road": 10000,
  "main:moveRobber": 20000,
  "main:roadBuilding": 10000
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
  "main:preRoll": "autoRoll",
  "main:robberDiscard": "autoDiscard",
  "placement:settlement": "autoPlaceSettlement",
  "placement:road": "autoPlaceRoad",
  "main:moveRobber": "autoMoveRobber",
  "main:roadBuilding": "autoPlaceRoad"
};

export class TimerManager {
  constructor({ dispatch }) {
    this.dispatch = dispatch;
    this.matches = new Map();
  }

  onState(matchID, state, deltalog) {
    const stageKey = this.getStageKey(state);
    const prev = this.matches.get(matchID) ?? {};
    const turnNumber = state.ctx.turn;

    if (prev.stageKey === stageKey && prev.turnNumber === turnNumber) {
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

    if (stageTimeoutMs) {
      const playerID = state.ctx.currentPlayer;
      const move = STAGE_TIMEOUT_MOVES[stageKey];
      prev.stageStartedAtMs = Date.now();
      prev.stageDurationMs = stageTimeoutMs;
      prev.stageTimeoutId = setTimeout(() => {
        this.dispatch({ matchID, move, playerID });
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

    const bonusMs = this.getTurnBonusMs(deltalog);
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

  startTurnTimer(matchID, state, record) {
    if (record.turnTimeoutId) {
      clearTimeout(record.turnTimeoutId);
    }
    record.turnStartedAtMs = Date.now();
    const playerID = state.ctx.currentPlayer;
    record.turnTimeoutId = setTimeout(() => {
      this.dispatch({ matchID, move: "autoEndTurn", playerID });
    }, record.turnRemainingMs);
  }

  pauseTurnTimer(record) {
    if (!record.turnTimeoutId) return;
    clearTimeout(record.turnTimeoutId);
    record.turnTimeoutId = undefined;
    const elapsed = Date.now() - record.turnStartedAtMs;
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
    const elapsed = Date.now() - record.stageStartedAtMs;
    return Math.max(0, record.stageDurationMs - elapsed);
  }

  getTurnRemainingMs(record) {
    if (record.turnRemainingMs == null) return null;
    if (!record.turnTimeoutId || !record.turnStartedAtMs) {
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
    const active = ctx.activePlayers?.[ctx.currentPlayer] ?? "";
    const stage = typeof active === "string" ? active : active?.stage ?? "";
    const devPlay = G?.devCardPlay;
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
}
