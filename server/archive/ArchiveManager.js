export class ArchiveManager {
  constructor({
    archiveFinishedMatch,
    cleanupArchivedMatch,
    cleanupEnabled = false,
    graceMs = 5_000,
  } = {}) {
    this.archiveFinishedMatch = archiveFinishedMatch;
    this.cleanupArchivedMatch = cleanupArchivedMatch;
    this.cleanupEnabled = cleanupEnabled;
    this.graceMs = graceMs;
    this.archivingMatchIDs = new Set();
    this.archivedMatchIDs = new Set();
    this.cleanupTimers = new Map();
    this.matchDataByMatch = new Map();
  }

  onMatchData(matchID, matchData) {
    this.matchDataByMatch.set(matchID, matchData);
  }

  async onState(matchID, state) {
    if (!state?.ctx?.gameover) {
      return;
    }

    if (this.archivingMatchIDs.has(matchID) || this.archivedMatchIDs.has(matchID)) {
      return;
    }

    this.archivingMatchIDs.add(matchID);

    try {
      await this.archiveFinishedMatch?.({
        matchID,
        state,
        matchData: this.matchDataByMatch.get(matchID) ?? [],
      });

      this.archivedMatchIDs.add(matchID);
      if (this.cleanupEnabled) {
        this.scheduleCleanup(matchID);
      }
    } finally {
      this.archivingMatchIDs.delete(matchID);
    }
  }

  scheduleCleanup(matchID) {
    if (this.cleanupTimers.has(matchID)) {
      return;
    }

    const timer = setTimeout(() => {
      this.cleanupTimers.delete(matchID);
      Promise.resolve(this.cleanupArchivedMatch?.({ matchID }))
        .catch(() => {})
        .finally(() => {
          this.matchDataByMatch.delete(matchID);
        });
    }, this.graceMs);

    this.cleanupTimers.set(matchID, timer);
  }

  deleteMatch(matchID) {
    const key = String(matchID);
    const cleanupTimer = this.cleanupTimers.get(key);
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
    }
    this.cleanupTimers.delete(key);
    this.archivingMatchIDs.delete(key);
    this.archivedMatchIDs.delete(key);
    this.matchDataByMatch.delete(key);
  }
}
