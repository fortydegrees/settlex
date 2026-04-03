const DEFAULT_DISCONNECT_TIMEOUT_MS = 60_000;

const isResolvedState = (state) =>
  Boolean(state?.ctx?.gameover || state?.G?.core?.gameOver);

const getPlayerIdsFromState = (state) =>
  Array.isArray(state?.G?.core?.players)
    ? state.G.core.players.map(String)
    : [];

const createEmptyRecord = () => ({
  statusByPlayerId: {},
  activeDisconnectPlayerId: null,
  deadlineAtMs: null,
  events: [],
  nextEventId: 1,
  timeoutIdByPlayerId: {},
  lastGameLogSeq: 0,
  resolved: false,
  seenMatchData: false,
  lastConnectedByPlayerId: {}
});

export class DisconnectPresenceManager {
  constructor({ dispatch, disconnectTimeoutMs = DEFAULT_DISCONNECT_TIMEOUT_MS }) {
    this.dispatch = typeof dispatch === "function" ? dispatch : () => {};
    this.disconnectTimeoutMs = disconnectTimeoutMs;
    this.matches = new Map();
  }

  getRecord(matchID) {
    const key = String(matchID);
    if (!this.matches.has(key)) {
      this.matches.set(key, createEmptyRecord());
    }
    return this.matches.get(key);
  }

  clearTimeout(record, playerId = null) {
    if (playerId == null) {
      Object.values(record.timeoutIdByPlayerId).forEach((timeoutId) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
      record.timeoutIdByPlayerId = {};
      return;
    }

    const normalizedPlayerId = String(playerId);
    const timeoutId = record.timeoutIdByPlayerId[normalizedPlayerId];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete record.timeoutIdByPlayerId[normalizedPlayerId];
    }
  }

  refreshActiveDisconnect(record) {
    const now = Date.now();
    const activeEntries = Object.entries(record.statusByPlayerId)
      .filter(([, status]) => {
        if (status?.status !== "disconnected") return false;
        return Number.isFinite(status?.reconnectDeadlineAtMs) &&
          status.reconnectDeadlineAtMs > now;
      })
      .sort((left, right) => {
        const leftDeadline = left[1].reconnectDeadlineAtMs;
        const rightDeadline = right[1].reconnectDeadlineAtMs;
        if (leftDeadline !== rightDeadline) {
          return leftDeadline - rightDeadline;
        }
        return String(left[0]).localeCompare(String(right[0]));
      });

    if (activeEntries.length === 0) {
      record.activeDisconnectPlayerId = null;
      record.deadlineAtMs = null;
      return;
    }

    const [playerId, status] = activeEntries[0];
    record.activeDisconnectPlayerId = playerId;
    record.deadlineAtMs = status.reconnectDeadlineAtMs;
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
        record.statusByPlayerId[playerId] = { status: "connected" };
      }
    });
  }

  onState(matchID, state) {
    const record = this.getRecord(matchID);
    record.lastGameLogSeq = state?.G?.gameLogSeq ?? record.lastGameLogSeq ?? 0;
    this.ensurePlayersFromState(record, state);

    if (isResolvedState(state)) {
      record.resolved = true;
      Object.keys(record.statusByPlayerId).forEach((playerId) => {
        record.statusByPlayerId[playerId] = { status: "connected" };
      });
      record.activeDisconnectPlayerId = null;
      record.deadlineAtMs = null;
      this.clearTimeout(record);
      return;
    }

    this.refreshActiveDisconnect(record);
  }

  startDisconnectTimer(matchID, playerId, record) {
    const normalizedPlayerId = String(playerId);
    this.clearTimeout(record, normalizedPlayerId);
    record.timeoutIdByPlayerId[normalizedPlayerId] = setTimeout(() => {
      delete record.timeoutIdByPlayerId[normalizedPlayerId];
      record.resolved = true;
      this.refreshActiveDisconnect(record);
      this.pushEvent(record, "server:disconnectForfeit", normalizedPlayerId);
      this.dispatch({
        matchID: String(matchID),
        move: "resolveDisconnectForfeit",
        playerID: normalizedPlayerId
      });
    }, this.disconnectTimeoutMs);
  }

  handleDisconnect(matchID, playerId, record) {
    if (record.resolved) return;
    const normalizedPlayerId = String(playerId);
    const now = Date.now();
    record.statusByPlayerId[normalizedPlayerId] = {
      status: "disconnected",
      disconnectedAtMs: now,
      reconnectDeadlineAtMs: now + this.disconnectTimeoutMs
    };
    this.refreshActiveDisconnect(record);
    this.pushEvent(record, "server:disconnect", normalizedPlayerId);
    this.startDisconnectTimer(matchID, normalizedPlayerId, record);
  }

  handleReconnect(playerId, record) {
    const normalizedPlayerId = String(playerId);
    this.clearTimeout(record, normalizedPlayerId);
    record.statusByPlayerId[normalizedPlayerId] = { status: "connected" };
    this.refreshActiveDisconnect(record);
    this.pushEvent(record, "server:reconnect", normalizedPlayerId);
  }

  onMatchData(matchID, matchData) {
    const record = this.getRecord(matchID);
    const seats = Array.isArray(matchData) ? matchData : [];

    seats.forEach((seat) => {
      const playerId = seat?.id == null ? null : String(seat.id);
      if (playerId == null) return;
      if (!record.statusByPlayerId[playerId]) {
        record.statusByPlayerId[playerId] = { status: "connected" };
      }
    });

    const hasSeenMatchData = record.seenMatchData;
    record.seenMatchData = true;

    for (const seat of seats) {
      const playerId = seat?.id == null ? null : String(seat.id);
      if (playerId == null) continue;
      const isConnected = seat?.isConnected !== false;
      const hadConnectedValue = Object.prototype.hasOwnProperty.call(
        record.lastConnectedByPlayerId,
        playerId
      );
      const previous = record.lastConnectedByPlayerId[playerId];
      record.lastConnectedByPlayerId[playerId] = isConnected;

      if (!hasSeenMatchData || !hadConnectedValue) {
        record.statusByPlayerId[playerId] = record.resolved
          ? { status: "connected" }
          : { status: isConnected ? "connected" : "disconnected" };
        continue;
      }

      if (record.resolved) {
        record.statusByPlayerId[playerId] = { status: "connected" };
        if (previous === true && isConnected === false) {
          this.pushEvent(record, "server:leave", playerId);
        } else if (previous === false && isConnected === true) {
          this.pushEvent(record, "server:return", playerId);
        }
        continue;
      }

      if (previous === true && isConnected === false) {
        this.handleDisconnect(matchID, playerId, record);
        continue;
      }

      if (previous === false && isConnected === true) {
        this.handleReconnect(playerId, record);
      }
    }
  }

  getSnapshot(matchID) {
    const record = this.getRecord(matchID);
    this.refreshActiveDisconnect(record);
    return {
      activeDisconnectPlayerId: record.activeDisconnectPlayerId,
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
