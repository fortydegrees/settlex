const DEFAULT_TURN_START_STATE = {
  currentPlayerId: null,
  phase: null,
  initialized: false
};

export function getTurnStartCueDecision({
  currentPlayerId,
  playerID,
  phase,
  prevState
} = {}) {
  const state = prevState ?? DEFAULT_TURN_START_STATE;

  if (!currentPlayerId || !playerID) {
    return { play: false, nextState: state };
  }

  if (!state.initialized) {
    return {
      play: false,
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

export { DEFAULT_TURN_START_STATE };
