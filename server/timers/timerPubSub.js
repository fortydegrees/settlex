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
  return {
    publish(channelId, payload) {
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
      }
      base.publish(channelId, payload);
    },
    subscribe(channelId, callback) {
      base.subscribe(channelId, callback);
    },
    unsubscribeAll(channelId) {
      base.unsubscribeAll(channelId);
    }
  };
}
