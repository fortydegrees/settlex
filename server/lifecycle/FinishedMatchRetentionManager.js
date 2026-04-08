const isResolvedState = (state) =>
  Boolean(state?.ctx?.gameover || state?.G?.core?.gameOver);

const areAllTrackedPlayersDisconnected = (matchData = []) => {
  const seats = Array.isArray(matchData)
    ? matchData.filter((seat) => seat?.id != null)
    : [];

  return seats.length > 0 && seats.every((seat) => seat?.isConnected === false);
};

const createRecord = () => ({
  finished: false,
  archived: false,
  cleanedUp: false,
  matchData: [],
  cleanupTimer: null,
});

export class FinishedMatchRetentionManager {
  constructor({
    cleanupArchivedMatch,
    matchChatStore,
    graceMs = 300_000,
  } = {}) {
    this.cleanupArchivedMatch = cleanupArchivedMatch;
    this.matchChatStore = matchChatStore;
    this.graceMs = graceMs;
    this.matches = new Map();
  }

  getRecord(matchID) {
    const key = String(matchID);
    if (!this.matches.has(key)) {
      this.matches.set(key, createRecord());
    }
    return this.matches.get(key);
  }

  clearCleanupTimer(record) {
    if (!record.cleanupTimer) {
      return;
    }

    clearTimeout(record.cleanupTimer);
    record.cleanupTimer = null;
  }

  isCleanupEligible(record) {
    return (
      record.finished &&
      record.archived &&
      !record.cleanedUp &&
      areAllTrackedPlayersDisconnected(record.matchData)
    );
  }

  scheduleCleanup(matchID, record) {
    if (record.cleanupTimer) {
      return;
    }

    record.cleanupTimer = setTimeout(() => {
      record.cleanupTimer = null;
      Promise.resolve(this.cleanupArchivedMatch?.({ matchID }))
        .then(() => {
          record.cleanedUp = true;
          this.matchChatStore?.clear?.(matchID);
          this.matches.delete(String(matchID));
        })
        .catch(() => {});
    }, this.graceMs);
  }

  reevaluate(matchID) {
    const record = this.getRecord(matchID);

    if (this.isCleanupEligible(record)) {
      this.scheduleCleanup(matchID, record);
      return;
    }

    this.clearCleanupTimer(record);
  }

  onState(matchID, state) {
    const record = this.getRecord(matchID);
    record.finished = isResolvedState(state);
    this.reevaluate(matchID);
  }

  onMatchData(matchID, matchData) {
    const record = this.getRecord(matchID);
    record.matchData = Array.isArray(matchData) ? [...matchData] : [];
    this.reevaluate(matchID);
  }

  onArchived(matchID) {
    const record = this.getRecord(matchID);
    record.archived = true;
    this.reevaluate(matchID);
  }
}
