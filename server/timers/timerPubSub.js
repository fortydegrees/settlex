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

export function createTimerPubSub(
  timerManager,
  { botManager, disconnectManager, idleManager, archiveManager, stateLoader } = {}
) {
  const base = new InMemoryPubSub();
  const latestStateByMatch = new Map();

  const isStateLike = (value) =>
    Boolean(value && typeof value === "object" && (value.G || value.ctx));

  const getPayloadState = (payload) => {
    if (isStateLike(payload?.state)) {
      return payload.state;
    }

    if (payload?.type === "update") {
      return isStateLike(payload?.args?.[1]) ? payload.args[1] : null;
    }

    if (payload?.type === "patch") {
      return isStateLike(payload?.args?.[3]) ? payload.args[3] : null;
    }

    return null;
  };

  const getPayloadDeltalog = (payload, state) => {
    if (payload?.deltalog != null) {
      return payload.deltalog;
    }

    if (payload?.type === "update") {
      return payload?.args?.[2] ?? state?.deltalog ?? state?.G?.deltalog ?? null;
    }

    if (payload?.type === "patch") {
      return payload?.args?.[4] ?? state?.deltalog ?? state?.G?.deltalog ?? null;
    }

    return null;
  };

  const buildStateWithSnapshots = (matchID, state) => {
    if (!state) return state;
    const timerSnapshot = timerManager.getTimerSnapshot(matchID, state);
    const serverTimeMs = Date.now();
    return {
      ...state,
      timerSnapshot,
      timerServerTimeMs: serverTimeMs,
      disconnectPresence: disconnectManager?.getSnapshot?.(matchID) ?? null,
      disconnectServerTimeMs: serverTimeMs,
      idlePresence: idleManager?.getSnapshot?.(matchID) ?? null,
      idleServerTimeMs: serverTimeMs
    };
  };

  const attachSnapshots = (payload, matchID, state) => {
    if (!state) return payload;

    if (payload?.type === "update") {
      const args = payload.args ?? [];
      const deltalog = args.length > 2 ? args[2] : undefined;
      const stateWithSnapshots = buildStateWithSnapshots(matchID, state);
      return {
        ...payload,
        args: deltalog === undefined
          ? [matchID, stateWithSnapshots]
          : [matchID, stateWithSnapshots, deltalog]
      };
    }

    if (payload?.type === "patch") {
      const args = payload.args ?? [];
      const prevStateID = args[1];
      const prevState = args[2];
      const stateWithSnapshots = buildStateWithSnapshots(matchID, state);
      return {
        ...payload,
        args: [matchID, prevStateID, prevState, stateWithSnapshots]
      };
    }

    return payload;
  };

  const rememberState = (matchID, state, deltalog = null) => {
    if (!state) return;
    latestStateByMatch.set(matchID, state);
    timerManager.onState(matchID, state, deltalog);
    disconnectManager?.onState?.(matchID, state, deltalog);
    idleManager?.onState?.(matchID, state, deltalog);
    archiveManager?.onState?.(matchID, state);
  };

  const rebroadcastState = (channelId, matchID, state) => {
    if (!state) return;
    rememberState(matchID, state, null);
    base.publish(
      channelId,
      attachSnapshots({ type: "update", args: [matchID, state] }, matchID, state)
    );
  };

  return {
    publish(channelId, payload) {
      if (channelId.startsWith(MATCH_PREFIX)) {
        const matchID = channelId.slice(MATCH_PREFIX.length);
        if (payload?.type === "matchData") {
          botManager?.syncMatchBotsFromMatchData?.(matchID, payload.args?.[1]);
        }
        const state = getPayloadState(payload);
        const deltalog = getPayloadDeltalog(payload, state);

        if (state) {
          rememberState(matchID, state, deltalog);
        }

        if (payload?.type === "matchData") {
          const matchData = payload?.args?.[1] ?? [];
          disconnectManager?.onMatchData?.(matchID, matchData);
          idleManager?.onMatchData?.(matchID, matchData);
          archiveManager?.onMatchData?.(matchID, matchData);
          const cachedState = latestStateByMatch.get(matchID) ?? null;
          base.publish(channelId, payload);
          if (cachedState) {
            rebroadcastState(channelId, matchID, cachedState);
          } else if (typeof stateLoader === "function") {
            Promise.resolve(stateLoader(matchID))
              .then((loaded) => {
                const loadedState = loaded?.state ?? loaded ?? null;
                if (!loadedState) return;
                rebroadcastState(channelId, matchID, loadedState);
              })
              .catch(() => {});
          }
          return;
        }

        base.publish(channelId, attachSnapshots(payload, matchID, state));
        return;
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
