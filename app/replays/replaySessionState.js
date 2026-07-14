import { clampReplayEventIndex } from "./replayTimeline";

export const createReplaySessionState = ({
  eventCount,
  perspectiveId = null,
}) => ({
  eventCount,
  eventIndex: 0,
  perspectiveId,
  panelOpen: true,
  resultsOpen: false,
  resultsReturnEventIndex: null,
  terminalResultsSeen: false,
});

export const replaySessionReducer = (state, action) => {
  const finalEventIndex = Math.max(state.eventCount - 1, 0);
  if (action.type === "seek") {
    const eventIndex = clampReplayEventIndex(
      action.eventIndex,
      state.eventCount
    );
    const reachedTerminal =
      eventIndex === finalEventIndex && !state.terminalResultsSeen;
    return {
      ...state,
      eventIndex,
      resultsOpen: reachedTerminal ? true : state.resultsOpen,
      terminalResultsSeen: state.terminalResultsSeen || reachedTerminal,
    };
  }
  if (action.type === "openResults") {
    return {
      ...state,
      eventIndex: finalEventIndex,
      resultsOpen: true,
      resultsReturnEventIndex:
        state.eventIndex < finalEventIndex ? state.eventIndex : null,
      terminalResultsSeen: true,
    };
  }
  if (action.type === "closeResults") {
    return {
      ...state,
      eventIndex: state.resultsReturnEventIndex ?? state.eventIndex,
      resultsOpen: false,
      resultsReturnEventIndex: null,
    };
  }
  if (action.type === "setPerspective") {
    return { ...state, perspectiveId: action.perspectiveId };
  }
  if (action.type === "setPanelOpen") {
    return { ...state, panelOpen: action.open };
  }
  return state;
};
