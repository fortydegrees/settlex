"use client";

import { useCallback, useEffect, useReducer } from "react";
import { clampReplayEventIndex } from "./replayTimeline";

export const replayNavigationReducer = (state, action) => {
  if (action.type === "syncCount") {
    return {
      eventCount: action.eventCount,
      eventIndex: clampReplayEventIndex(
        state.eventIndex,
        action.eventCount
      ),
    };
  }
  if (action.type === "seek") {
    return {
      ...state,
      eventIndex: clampReplayEventIndex(
        action.eventIndex,
        state.eventCount
      ),
    };
  }
  if (action.type === "previous") {
    return { ...state, eventIndex: Math.max(state.eventIndex - 1, 0) };
  }
  if (action.type === "next") {
    return {
      ...state,
      eventIndex: Math.min(
        state.eventIndex + 1,
        Math.max(state.eventCount - 1, 0)
      ),
    };
  }
  return state;
};

export function useReplayNavigation({
  eventCount,
  initialEventIndex = 0,
}) {
  const [state, dispatch] = useReducer(replayNavigationReducer, {
    eventCount,
    eventIndex: clampReplayEventIndex(initialEventIndex, eventCount),
  });
  useEffect(
    () => dispatch({ type: "syncCount", eventCount }),
    [eventCount]
  );
  return {
    eventIndex: state.eventIndex,
    seek: useCallback(
      (eventIndex) => dispatch({ type: "seek", eventIndex }),
      []
    ),
    previous: useCallback(() => dispatch({ type: "previous" }), []),
    next: useCallback(() => dispatch({ type: "next" }), []),
  };
}
