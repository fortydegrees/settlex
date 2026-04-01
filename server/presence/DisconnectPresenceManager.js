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
  timeoutId: null,
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
      record.activeDisconnectPlayerId = null;
      record.deadlineAtMs = null;
      this.clearTimeout(record);
    }
  }

  startDisconnectTimer(matchID, playerId, record) {
    this.clearTimeout(record);
    record.timeoutId = setTimeout(() => {
      record.timeoutId = null;
      record.activeDisconnectPlayerId = null;
      record.resolved = true;
      this.pushEvent(record, "server:disconnectForfeit", playerId);
      this.dispatch({
        matchID: String(matchID),
        move: "resolveDisconnectForfeit",
        playerID: String(playerId)
      });
    }, this.disconnectTimeoutMs);
  }

  handleDisconnect(matchID, playerId, record) {
    if (record.resolved) return;
    const now = Date.now();
    record.activeDisconnectPlayerId = playerId;
    record.deadlineAtMs = now + this.disconnectTimeoutMs;
    record.statusByPlayerId[playerId] = {
      status: "disconnected",
      disconnectedAtMs: now,
      reconnectDeadlineAtMs: record.deadlineAtMs
    };
    this.pushEvent(record, "server:disconnect", playerId);
    this.startDisconnectTimer(matchID, playerId, record);
  }

  handleReconnect(playerId, record) {
    if (record.activeDisconnectPlayerId !== playerId) {
      record.statusByPlayerId[playerId] = { status: "connected" };
      return;
    }

    this.clearTimeout(record);
    record.activeDisconnectPlayerId = null;
    record.deadlineAtMs = null;
    record.statusByPlayerId[playerId] = { status: "connected" };
    this.pushEvent(record, "server:reconnect", playerId);
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
        record.statusByPlayerId[playerId] = { status: isConnected ? "connected" : "disconnected" };
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
