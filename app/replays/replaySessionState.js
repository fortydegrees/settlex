import { clampReplayEventIndex } from "./replayTimeline";

export const createReplaySessionState = ({
  eventCount,
  perspectiveId = null,
}) => ({
  eventCount,
  eventIndex: 0,
  perspectiveId,
  panelOpen: true,
  mobilePanelOpen: false,
  resultsOpen: false,
  resultsReturnEventIndex: null,
  resultsReturnPanelOpen: null,
  resultsReturnMobilePanelOpen: null,
  terminalResultsSeen: false,
});

const openReplayResults = (
  state,
  { eventIndex, returnEventIndex, markTerminalSeen = false }
) => ({
  ...state,
  eventIndex,
  panelOpen: false,
  mobilePanelOpen: false,
  resultsOpen: true,
  resultsReturnEventIndex: returnEventIndex,
  resultsReturnPanelOpen: state.panelOpen,
  resultsReturnMobilePanelOpen: state.mobilePanelOpen,
  terminalResultsSeen: state.terminalResultsSeen || markTerminalSeen,
});

export const createReplayActivationState = ({
  identityKey = null,
  replayActive = false,
} = {}) => ({
  identityKey,
  intentPending: false,
  replayActive,
});

export const getReplayPayloadStatusForIdentity = ({
  identityKey,
  payloadIdentityKey,
  payloadStatus,
}) => (payloadIdentityKey === identityKey ? payloadStatus : "loading");

export const isReplayReadyForIdentity = ({
  identityKey,
  activation,
  sessionIdentityKey,
  payloadIdentityKey,
  payloadStatus = "ready",
}) =>
  activation.identityKey === identityKey &&
  activation.replayActive &&
  sessionIdentityKey === identityKey &&
  payloadIdentityKey === identityKey &&
  payloadStatus === "ready";

export const replayActivationReducer = (state, action) => {
  if (action.type === "resetIdentity") {
    if (action.identityKey === state.identityKey) return state;
    return createReplayActivationState({
      identityKey: action.identityKey,
      replayActive: action.replayActive,
    });
  }
  if (action.type === "requestReplay") {
    const requestState =
      action.identityKey === state.identityKey
        ? state
        : createReplayActivationState({ identityKey: action.identityKey });
    if (requestState.replayActive) return requestState;
    if (action.payloadStatus === "ready") {
      return { ...requestState, intentPending: false, replayActive: true };
    }
    if (requestState.intentPending) return requestState;
    return { ...requestState, intentPending: true, replayActive: false };
  }
  if (action.identityKey !== state.identityKey) return state;
  if (action.type === "payloadReady") {
    if (!state.intentPending || state.replayActive) return state;
    return { ...state, intentPending: false, replayActive: true };
  }
  return state;
};

export const replaySessionReducer = (state, action) => {
  const finalEventIndex = Math.max(state.eventCount - 1, 0);
  if (action.type === "seek") {
    const eventIndex = clampReplayEventIndex(
      action.eventIndex,
      state.eventCount
    );
    const reachedTerminal =
      eventIndex === finalEventIndex && !state.terminalResultsSeen;
    if (reachedTerminal) {
      return openReplayResults(state, {
        eventIndex,
        returnEventIndex: null,
        markTerminalSeen: true,
      });
    }
    return { ...state, eventIndex };
  }
  if (action.type === "openResults") {
    return openReplayResults(state, {
      eventIndex: finalEventIndex,
      returnEventIndex:
        state.eventIndex < finalEventIndex ? state.eventIndex : null,
    });
  }
  if (action.type === "closeResults") {
    return {
      ...state,
      eventIndex: state.resultsReturnEventIndex ?? state.eventIndex,
      panelOpen: state.resultsReturnPanelOpen ?? state.panelOpen,
      mobilePanelOpen:
        state.resultsReturnMobilePanelOpen ?? state.mobilePanelOpen,
      resultsOpen: false,
      resultsReturnEventIndex: null,
      resultsReturnPanelOpen: null,
      resultsReturnMobilePanelOpen: null,
    };
  }
  if (action.type === "setPerspective") {
    return { ...state, perspectiveId: action.perspectiveId };
  }
  if (action.type === "setPanelOpen") {
    return { ...state, panelOpen: action.open };
  }
  if (action.type === "setMobilePanelOpen") {
    return { ...state, mobilePanelOpen: action.open };
  }
  return state;
};
