const DEFAULT_IDLE_TIMEOUT_MS = 60_000;
const DEFAULT_IDLE_STRIKE_THRESHOLD = 2;

const isResolvedState = (state) =>
  Boolean(state?.ctx?.gameover || state?.G?.core?.gameOver);

const getPlayerIdsFromState = (state) =>
  Array.isArray(state?.G?.core?.players)
    ? state.G.core.players.map(String)
    : [];

const createEmptyRecord = () => ({
  statusByPlayerId: {},
  activeIdlePlayerId: null,
  deadlineAtMs: null,
  events: [],
  nextEventId: 1,
  timeoutId: null,
  lastGameLogSeq: 0,
  resolved: false,
  currentTurn: null
});

const isMainGameplayState = (state) => state?.ctx?.phase === "main";

const isAutoMoveType = (type) => typeof type === "string" && type.startsWith("auto");

export class IdlePresenceManager {
  constructor({
    dispatch,
    isBotPlayer,
    idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
    idleStrikeThreshold = DEFAULT_IDLE_STRIKE_THRESHOLD
  } = {}) {
    this.dispatch = typeof dispatch === "function" ? dispatch : () => {};
    this.isBotPlayer =
      typeof isBotPlayer === "function" ? isBotPlayer : () => false;
    this.idleTimeoutMs = idleTimeoutMs;
    this.idleStrikeThreshold = idleStrikeThreshold;
    this.matches = new Map();
  }

  getRecord(matchID) {
    const key = String(matchID);
    if (!this.matches.has(key)) {
      this.matches.set(key, createEmptyRecord());
    }
    return this.matches.get(key);
  }

  clearTimeout(record) {
    if (record.timeoutId) {
      clearTimeout(record.timeoutId);
      record.timeoutId = null;
    }
  }

  pushEvent(record, type, playerId) {
    record.events.push({
      id: record.nextEventId++,
      type,
      playerId: playerId == null ? null : String(playerId),
      createdAtMs: Date.now(),
      afterGameLogSeq: record.lastGameLogSeq ?? 0
    });
  }

  ensurePlayersFromState(record, state) {
    const playerIds = getPlayerIdsFromState(state);
    playerIds.forEach((playerId) => {
      if (!record.statusByPlayerId[playerId]) {
        record.statusByPlayerId[playerId] = {
          status: "connected",
          idleStrikeCount: 0
        };
      }
    });
  }

  isTrackedHumanPlayer(matchID, playerId) {
    return !this.isBotPlayer({
      matchID: String(matchID),
      playerID: String(playerId)
    });
  }

  resetPlayer(record, playerId) {
    record.statusByPlayerId[playerId] = {
      status: "connected",
      idleStrikeCount: 0
    };
    if (record.activeIdlePlayerId === playerId) {
      this.clearTimeout(record);
      record.activeIdlePlayerId = null;
      record.deadlineAtMs = null;
    }
  }

  ensureCurrentTurn(record, state) {
    if (!isMainGameplayState(state)) return;
    if (record.currentTurn) return;
    record.currentTurn = {
      playerId: String(state?.ctx?.currentPlayer),
      turn: state?.ctx?.turn,
      hadHumanMove: false,
      hadAutoMove: false
    };
  }

  applyDeltalog(matchID, record, deltalog, state) {
    const entries = Array.isArray(deltalog) ? deltalog : [];
    for (const entry of entries) {
      if (entry?.action?.type !== "MAKE_MOVE") continue;
      const payload = entry.action.payload ?? {};
      const playerId =
        payload.playerID == null ? null : String(payload.playerID);
      if (playerId == null) continue;
      if (!this.isTrackedHumanPlayer(matchID, playerId)) continue;

      if (
        !record.currentTurn &&
        isMainGameplayState(state) &&
        String(state?.ctx?.currentPlayer) === playerId
      ) {
        this.ensureCurrentTurn(record, state);
      }

      if (record.currentTurn?.playerId !== playerId) continue;

      if (isAutoMoveType(payload.type)) {
        record.currentTurn.hadAutoMove = true;
        continue;
      }

      record.currentTurn.hadHumanMove = true;
      this.resetPlayer(record, playerId);
    }
  }

  finalizeTurn(matchID, record) {
    const turn = record.currentTurn;
    if (!turn || record.resolved) return;

    const playerId = turn.playerId;
    if (!this.isTrackedHumanPlayer(matchID, playerId)) {
      return;
    }
    if (!record.statusByPlayerId[playerId]) {
      record.statusByPlayerId[playerId] = {
        status: "connected",
        idleStrikeCount: 0
      };
    }

    if (turn.hadHumanMove) {
      this.resetPlayer(record, playerId);
      return;
    }

    if (!turn.hadAutoMove) return;

    const nextStrikeCount =
      (record.statusByPlayerId[playerId]?.idleStrikeCount ?? 0) + 1;

    if (record.activeIdlePlayerId && record.activeIdlePlayerId !== playerId) {
      record.statusByPlayerId[playerId] = {
        status: "connected",
        idleStrikeCount: nextStrikeCount
      };
      return;
    }

    if (nextStrikeCount < this.idleStrikeThreshold) {
      record.statusByPlayerId[playerId] = {
        status: "connected",
        idleStrikeCount: nextStrikeCount
      };
      return;
    }

    const now = Date.now();
    record.activeIdlePlayerId = playerId;
    record.deadlineAtMs = now + this.idleTimeoutMs;
    record.statusByPlayerId[playerId] = {
      status: "idle",
      idleStrikeCount: nextStrikeCount,
      idleStartedAtMs: now,
      idleDeadlineAtMs: record.deadlineAtMs
    };
    this.pushEvent(record, "server:idle", playerId);
    this.clearTimeout(record);
    record.timeoutId = setTimeout(() => {
      record.timeoutId = null;
      record.activeIdlePlayerId = null;
      record.deadlineAtMs = null;
      record.resolved = true;
      record.statusByPlayerId[playerId] = {
        status: "connected",
        idleStrikeCount: 0
      };
      this.pushEvent(record, "server:idleForfeit", playerId);
      this.dispatch({
        matchID: String(matchID),
        move: "resolveIdleForfeit",
        playerID: playerId
      });
    }, this.idleTimeoutMs);
  }

  onState(matchID, state, deltalog = null) {
    const record = this.getRecord(matchID);
    record.lastGameLogSeq = state?.G?.gameLogSeq ?? record.lastGameLogSeq ?? 0;
    this.ensurePlayersFromState(record, state);

    this.applyDeltalog(matchID, record, deltalog, state);

    const turnChanged =
      Boolean(record.currentTurn) &&
      (
        !isMainGameplayState(state) ||
        record.currentTurn.turn !== state?.ctx?.turn ||
        record.currentTurn.playerId !== String(state?.ctx?.currentPlayer)
      );

    if (turnChanged) {
      this.finalizeTurn(matchID, record);
      record.currentTurn = null;
    }

    if (isResolvedState(state)) {
      record.resolved = true;
      if (record.activeIdlePlayerId) {
        this.resetPlayer(record, record.activeIdlePlayerId);
      }
      record.currentTurn = null;
      return;
    }

    this.ensureCurrentTurn(record, state);
  }

  onMatchData(matchID, matchData) {
    const record = this.getRecord(matchID);
    const seats = Array.isArray(matchData) ? matchData : [];
    for (const seat of seats) {
      const playerId = seat?.id == null ? null : String(seat.id);
      if (playerId == null) continue;
      if (!record.statusByPlayerId[playerId]) {
        record.statusByPlayerId[playerId] = {
          status: "connected",
          idleStrikeCount: 0
        };
      }
      if (seat?.isConnected === false) {
        this.resetPlayer(record, playerId);
      }
    }
  }

  acknowledge(matchID, playerID) {
    const record = this.getRecord(matchID);
    const normalizedPlayerId = String(playerID);
    if (record.activeIdlePlayerId !== normalizedPlayerId) {
      return false;
    }

    this.resetPlayer(record, normalizedPlayerId);
    this.pushEvent(record, "server:idleAck", normalizedPlayerId);
    return true;
  }

  deleteMatch(matchID) {
    const key = String(matchID);
    const record = this.matches.get(key);
    if (!record) return;

    this.clearTimeout(record);
    this.matches.delete(key);
  }

  getSnapshot(matchID) {
    const record = this.getRecord(matchID);
    return {
      activeIdlePlayerId: record.activeIdlePlayerId,
      deadlineAtMs: record.deadlineAtMs,
      remainingMs:
        record.deadlineAtMs == null
          ? null
          : Math.max(0, record.deadlineAtMs - Date.now()),
      statusByPlayerId: { ...record.statusByPlayerId },
      events: [...record.events]
    };
  }
}
