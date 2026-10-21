const getDefaultNow = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export function createHomeDemoEventProgress(onCommit) {
  const startedEvents = new Map();
  const committedEventIds = new Set();

  const commit = (event) => {
    if (committedEventIds.has(event.id)) return;
    committedEventIds.add(event.id);
    startedEvents.delete(event.id);
    onCommit(event);
  };

  return {
    beginScene: () => {
      startedEvents.clear();
      committedEventIds.clear();
    },
    start: (event) => startedEvents.set(event.id, event),
    commit,
    settleStarted: () => {
      startedEvents.forEach(commit);
    }
  };
}

export function createPausableTimeoutScheduler({
  clearTimeoutImpl = globalThis.clearTimeout,
  initiallyPaused = false,
  nowImpl = getDefaultNow,
  setTimeoutImpl = globalThis.setTimeout
} = {}) {
  let paused = Boolean(initiallyPaused);
  let nextEntryId = 0;
  const entries = new Map();

  const arm = (entry) => {
    if (paused || entry.nativeId != null) return;

    entry.startedAtMs = nowImpl();
    entry.nativeId = setTimeoutImpl(() => {
      entry.nativeId = null;
      entry.startedAtMs = null;
      if (paused) return;

      entries.delete(entry.id);
      entry.callback();
    }, entry.remainingMs);
  };

  const cancel = (entryId) => {
    const entry = entries.get(entryId);
    if (!entry) return;

    if (entry.nativeId != null) {
      clearTimeoutImpl(entry.nativeId);
      entry.nativeId = null;
    }
    entries.delete(entryId);
  };

  const schedule = (callback, delayMs = 0) => {
    if (typeof callback !== "function") return () => {};

    const numericDelayMs = Number(delayMs);
    const entry = {
      callback,
      id: nextEntryId,
      nativeId: null,
      remainingMs: Number.isFinite(numericDelayMs)
        ? Math.max(0, numericDelayMs)
        : 0,
      startedAtMs: null
    };
    nextEntryId += 1;
    entries.set(entry.id, entry);
    arm(entry);

    return () => cancel(entry.id);
  };

  const pause = () => {
    if (paused) return;
    paused = true;
    const pausedAtMs = nowImpl();

    entries.forEach((entry) => {
      if (entry.nativeId == null) return;

      clearTimeoutImpl(entry.nativeId);
      entry.nativeId = null;
      entry.remainingMs = Math.max(
        0,
        entry.remainingMs - Math.max(0, pausedAtMs - entry.startedAtMs)
      );
      entry.startedAtMs = null;
    });
  };

  const resume = () => {
    if (!paused) return;
    paused = false;
    entries.forEach(arm);
  };

  const clear = () => {
    [...entries.keys()].forEach(cancel);
  };

  return {
    clear,
    pause,
    resume,
    schedule
  };
}
