const MATCH_PREFIX = "MATCH-";

class InMemoryPubSub {
  constructor() {
    this.callbacks = new Map();
  }

  publish(channelId, payload) {
    if (!this.callbacks.has(channelId)) return;
    const callbacks = this.callbacks.get(channelId);
    for (const callback of callbacks) {
      callback(payload);
    }
  }

  subscribe(channelId, callback) {
    if (!this.callbacks.has(channelId)) {
      this.callbacks.set(channelId, []);
    }
    this.callbacks.get(channelId).push(callback);
  }

  unsubscribeAll(channelId) {
    this.callbacks.delete(channelId);
  }
}

export function createTimerPubSub(timerManager) {
  const base = new InMemoryPubSub();
  const attachTimerSnapshot = (payload, matchID, state) => {
    if (!state) return payload;
    const timerSnapshot = timerManager.getTimerSnapshot(matchID, state);
    const serverTimeMs = Date.now();

    if (payload?.type === "update") {
      const args = payload.args ?? [];
      const deltalog = args.length > 2 ? args[2] : undefined;
      const stateWithTimer = {
        ...state,
        timerSnapshot,
        timerServerTimeMs: serverTimeMs
      };
      return {
        ...payload,
        args: deltalog === undefined
          ? [matchID, stateWithTimer]
          : [matchID, stateWithTimer, deltalog]
      };
    }

    if (payload?.type === "patch") {
      const args = payload.args ?? [];
      const prevStateID = args[1];
      const prevState = args[2];
      const stateWithTimer = {
        ...state,
        timerSnapshot,
        timerServerTimeMs: serverTimeMs
      };
      return {
        ...payload,
        args: [matchID, prevStateID, prevState, stateWithTimer]
      };
    }

    return payload;
  };

  return {
    publish(channelId, payload) {
      let updatedPayload = payload;
      if (channelId.startsWith(MATCH_PREFIX)) {
        const matchID = channelId.slice(MATCH_PREFIX.length);
        const state =
          payload?.state ??
          (payload?.type === "update" ? payload?.args?.[1] : null) ??
          (payload?.type === "patch" ? payload?.args?.[3] : null);
        const deltalog =
          payload?.deltalog ??
          (payload?.type === "update" ? payload?.args?.[2] : null) ??
          (payload?.type === "patch" ? payload?.args?.[4] : null);

        if (state) {
          timerManager.onState(matchID, state, deltalog);
        }

        updatedPayload = attachTimerSnapshot(payload, matchID, state);
      }
      base.publish(channelId, updatedPayload);
    },
    subscribe(channelId, callback) {
      base.subscribe(channelId, callback);
    },
    unsubscribeAll(channelId) {
      base.unsubscribeAll(channelId);
    }
  };
}
