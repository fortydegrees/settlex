const DEFAULT_TURN_START_STATE = {
  currentPlayerId: null,
  phase: null,
  initialized: false
};

export function getTurnStartCueDecision({
  currentPlayerId,
  playerID,
  phase,
  gameStartPlayed = false,
  prevState
} = {}) {
  const state = prevState ?? DEFAULT_TURN_START_STATE;

  if (!currentPlayerId || !playerID) {
    return { play: false, nextState: state };
  }

  if (!state.initialized) {
    return {
      play: gameStartPlayed && phase === "placement" && currentPlayerId === playerID,
      nextState: { currentPlayerId, phase, initialized: true }
    };
  }

  if (phase === "preGame") {
    return {
      play: false,
      nextState: { currentPlayerId, phase, initialized: true }
    };
  }

  const enteringPlacement = state.phase !== "placement" && phase === "placement";
  const currentPlayerChanged = currentPlayerId !== state.currentPlayerId;

  if (enteringPlacement || currentPlayerChanged) {
    return {
      play: currentPlayerId === playerID,
      nextState: { currentPlayerId, phase, initialized: true }
    };
  }

  if (phase !== state.phase) {
    return {
      play: false,
      nextState: { currentPlayerId, phase, initialized: true }
    };
  }

  return { play: false, nextState: state };
}

// Queue the opening turn notification until real jingle completion + a gap.
// Recheck relevance when it fires: the player may already have placed or left.
export function createTurnStartCueGate({ emit, isRelevant, gapMs = 500 }) {
  let held = false;
  let pending = false;
  let timer = null;
  let destroyed = false;

  const emitIfRelevant = () => {
    if (!destroyed && isRelevant()) emit();
  };

  return {
    hold: () => {
      if (destroyed) return;
      clearTimeout(timer);
      timer = null;
      held = true;
      pending = false;
    },
    release: () => {
      if (destroyed || !held || timer != null) return;
      timer = setTimeout(() => {
        timer = null;
        held = false;
        const shouldEmit = pending;
        pending = false;
        if (shouldEmit) emitIfRelevant();
      }, gapMs);
    },
    request: () => {
      if (destroyed) return;
      if (held) pending = true;
      else emitIfRelevant();
    },
    destroy: () => {
      destroyed = true;
      pending = false;
      clearTimeout(timer);
      timer = null;
    }
  };
}

export { DEFAULT_TURN_START_STATE };
