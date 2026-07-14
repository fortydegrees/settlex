"use client";

import {
  Fragment,
  createElement as h,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { GameScreenWithEffects } from "../catana/GameScreen";
import { ReplayPanel } from "./components/ReplayPanel";
import {
  buildReplayChatMessages,
  getReplayKeyboardAction,
} from "./replayClientState";
import {
  buildReplayGameScreenProps,
} from "./replayGameScreenProps";
import {
  createReplayActivationState,
  createReplaySessionState,
  getReplayPayloadStatusForIdentity,
  isReplayReadyForIdentity,
  replayActivationReducer,
  replaySessionReducer,
} from "./replaySessionState";
import {
  buildReplayTimeline,
  getNextTurnEventIndex,
  getPreviousTurnEventIndex,
} from "./replayTimeline";
import { usePostgameReplayPayload } from "./usePostgameReplayPayload";

const buildReplayMatchData = (participants = []) =>
  participants.map((participant) => ({
    id: participant.seatId,
    name: participant.usernameSnapshot,
    data: {
      participantType: participant.participantType,
      accountId: participant.accountId,
      botKey: participant.botKey,
      emoji: participant.avatarEmojiSnapshot,
      color: participant.avatarColorSnapshot,
    },
  }));

const postgameReplayReducer = (state, action) => {
  if (action.type === "startReplay") {
    return {
      ...createReplaySessionState({
        eventCount: action.eventCount,
        perspectiveId: action.perspectiveId,
      }),
      identityKey: action.identityKey,
      eventIndex: action.eventIndex ?? 0,
    };
  }
  return replaySessionReducer(state, action);
};

export function PostgameGameBoard(props) {
  const {
    initialReplayPayload = null,
    initialPerspectivePlayerID = null,
    initialFrameIndex = 0,
  } = props;
  const archivedMode = initialReplayPayload != null;
  const initialPayloadIdentityRef = useRef({
    payload: initialReplayPayload,
    version: 0,
  });
  if (initialPayloadIdentityRef.current.payload !== initialReplayPayload) {
    initialPayloadIdentityRef.current = {
      payload: initialReplayPayload,
      version: initialPayloadIdentityRef.current.version + 1,
    };
  }
  const bgioProps = archivedMode ? {} : props;
  const archivedMatchID =
    initialReplayPayload?.replay?.match?.bgioMatchId ??
    initialReplayPayload?.replay?.match?.replayId ??
    "unknown";
  const replayIdentityKey = archivedMode
    ? `archived:${archivedMatchID}:payload-${initialPayloadIdentityRef.current.version}`
    : `live:${bgioProps.matchID ?? "unknown"}`;
  const liveGameOver = Boolean(
    bgioProps.ctx?.gameover ?? bgioProps.G?.core?.gameOver
  );
  const replayPayload = usePostgameReplayPayload({
    matchID: bgioProps.matchID,
    identityKey: replayIdentityKey,
    enabled: !archivedMode && liveGameOver,
    initialPayload: initialReplayPayload,
  });
  const {
    identityKey: hookPayloadIdentityKey,
    status: hookPayloadStatus,
    retry: retryReplayPayload,
  } = replayPayload;
  const payloadIdentityKey = initialReplayPayload
    ? replayIdentityKey
    : hookPayloadIdentityKey;
  const replayPayloadStatus = getReplayPayloadStatusForIdentity({
    identityKey: replayIdentityKey,
    payloadIdentityKey,
    payloadStatus: initialReplayPayload ? "ready" : hookPayloadStatus,
  });
  const hydratedPayload = initialReplayPayload ?? replayPayload.payload;
  const replay = hydratedPayload?.replay ?? null;
  const safeFrames = useMemo(() => {
    const frames = hydratedPayload?.frames ?? [];
    if (frames.length > 0) return frames;
    if (!replay?.initialState) return [];
    return [{ index: 0, state: replay.initialState, logEntry: null }];
  }, [hydratedPayload?.frames, replay]);
  const timeline = useMemo(
    () =>
      buildReplayTimeline({
        frames: safeFrames,
        participants: replay?.participants ?? [],
      }),
    [replay?.participants, safeFrames]
  );
  const replayMatchData = useMemo(
    () => buildReplayMatchData(replay?.participants ?? []),
    [replay?.participants]
  );
  const chatMessages = useMemo(
    () => buildReplayChatMessages(replay?.chatMessages ?? []),
    [replay?.chatMessages]
  );
  const archivedInitialEventIndex =
    initialFrameIndex > 0 ? Math.max(timeline.events.length - 1, 0) : 0;
  const [session, dispatch] = useReducer(
    postgameReplayReducer,
    {
      eventCount: timeline.events.length,
      perspectiveId: archivedMode
        ? initialPerspectivePlayerID
        : bgioProps.playerID,
    },
    ({ eventCount, perspectiveId }) => ({
      ...createReplaySessionState({ eventCount, perspectiveId }),
      identityKey: archivedMode ? replayIdentityKey : null,
      eventIndex: archivedInitialEventIndex,
    })
  );
  const [activation, dispatchActivation] = useReducer(
    replayActivationReducer,
    { identityKey: replayIdentityKey, replayActive: archivedMode },
    createReplayActivationState
  );
  const sessionIdentityMatches = session.identityKey === replayIdentityKey;
  const displaySession = sessionIdentityMatches
    ? session
    : {
        ...createReplaySessionState({
          eventCount: timeline.events.length,
          perspectiveId: archivedMode
            ? initialPerspectivePlayerID
            : bgioProps.playerID,
        }),
        identityKey: replayIdentityKey,
        eventIndex: archivedMode ? archivedInitialEventIndex : 0,
      };
  const activationReady =
    activation.identityKey === replayIdentityKey && activation.replayActive;
  const payloadReadyForIdentity =
    payloadIdentityKey === replayIdentityKey && replayPayloadStatus === "ready";
  const replayActive = isReplayReadyForIdentity({
    identityKey: replayIdentityKey,
    activation,
    sessionIdentityKey: session.identityKey,
    payloadIdentityKey,
    payloadStatus: replayPayloadStatus,
  });
  const seekReplayEvent = useCallback(
    (eventIndex) => dispatch({ type: "seek", eventIndex }),
    []
  );
  const previousEvent = useCallback(
    () => seekReplayEvent(displaySession.eventIndex - 1),
    [displaySession.eventIndex, seekReplayEvent]
  );
  const nextEvent = useCallback(
    () => seekReplayEvent(displaySession.eventIndex + 1),
    [displaySession.eventIndex, seekReplayEvent]
  );
  const previousTurn = useCallback(
    () =>
      seekReplayEvent(
        getPreviousTurnEventIndex(displaySession.eventIndex, timeline.turnStarts)
      ),
    [displaySession.eventIndex, seekReplayEvent, timeline.turnStarts]
  );
  const nextTurn = useCallback(
    () =>
      seekReplayEvent(
        getNextTurnEventIndex(
          displaySession.eventIndex,
          timeline.turnStarts,
          timeline.events.length - 1
        )
      ),
    [
      seekReplayEvent,
      displaySession.eventIndex,
      timeline.events.length,
      timeline.turnStarts,
    ]
  );
  const handleReplayLogEntrySelect = useCallback(
    (entryKey) => {
      const eventIndex = timeline.logEventIndexByKey[String(entryKey)];
      if (Number.isInteger(eventIndex)) seekReplayEvent(eventIndex);
    },
    [seekReplayEvent, timeline.logEventIndexByKey]
  );
  const handleOpenReplay = useCallback(() => {
    dispatchActivation({
      type: "requestReplay",
      payloadStatus: replayPayloadStatus,
      identityKey: replayIdentityKey,
    });
    if (replayPayloadStatus === "error") {
      retryReplayPayload();
    }
  }, [replayIdentityKey, replayPayloadStatus, retryReplayPayload]);

  useEffect(() => {
    dispatchActivation({
      type: "resetIdentity",
      identityKey: replayIdentityKey,
      replayActive: archivedMode,
    });
  }, [archivedMode, replayIdentityKey]);

  useEffect(() => {
    if (hookPayloadStatus !== "ready") return;
    dispatchActivation({
      type: "payloadReady",
      identityKey: hookPayloadIdentityKey,
    });
  }, [hookPayloadIdentityKey, hookPayloadStatus]);

  useEffect(() => {
    if (
      !activationReady ||
      !payloadReadyForIdentity ||
      sessionIdentityMatches
    ) {
      return;
    }
    dispatch({
      type: "startReplay",
      identityKey: replayIdentityKey,
      eventCount: timeline.events.length,
      perspectiveId: archivedMode
        ? initialPerspectivePlayerID
        : bgioProps.playerID,
      eventIndex: archivedMode ? archivedInitialEventIndex : 0,
    });
  }, [
    activationReady,
    archivedInitialEventIndex,
    archivedMode,
    bgioProps.playerID,
    initialPerspectivePlayerID,
    payloadReadyForIdentity,
    replayIdentityKey,
    sessionIdentityMatches,
    timeline.events.length,
  ]);

  useEffect(() => {
    if (!replayActive) return undefined;
    const handleKeyDown = (event) => {
      const target = event.target;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target?.tagName)
      ) {
        return;
      }

      const keyboardAction = getReplayKeyboardAction(event);
      if (!keyboardAction) return;
      event.preventDefault();
      if (keyboardAction === "previousEvent") previousEvent();
      if (keyboardAction === "nextEvent") nextEvent();
      if (keyboardAction === "previousTurn") previousTurn();
      if (keyboardAction === "nextTurn") nextTurn();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextEvent, nextTurn, previousEvent, previousTurn, replayActive]);

  const currentEvent =
    timeline.events[displaySession.eventIndex] ?? timeline.events[0] ?? null;
  const matchID =
    replay?.match?.bgioMatchId ?? replay?.match?.replayId ?? bgioProps.matchID;
  const displayProps = replayActive
    ? {
        ...buildReplayGameScreenProps({
          event: currentEvent,
          perspectiveId: displaySession.perspectiveId,
          matchID,
          matchData: replayMatchData,
          resultsOpen: displaySession.resultsOpen,
        }),
        chatMessages,
        onReplayResultsOpen: () => dispatch({ type: "openResults" }),
        onReplayResultsClose: () => dispatch({ type: "closeResults" }),
        onReplayLogEntrySelect: handleReplayLogEntrySelect,
        replayConsoleMobileOpen: displaySession.mobilePanelOpen,
        onReplayMobileMetaPanelOpen: () =>
          dispatch({ type: "setMobilePanelOpen", open: false }),
      }
    : {
        ...bgioProps,
        postgameReplayStatus: replayPayloadStatus,
        onWatchReplay: handleOpenReplay,
      };
  const victoryTarget =
    currentEvent?.state?.G?.core?.ruleset?.victoryPointsToWin ?? 10;

  if (archivedMode && !replayActive) {
    return h(
      "div",
      { className: "replay-status-page", role: "status" },
      "Loading replay…"
    );
  }

  return h(
    Fragment,
    null,
    h(GameScreenWithEffects, displayProps),
    replayActive && !displaySession.resultsOpen
      ? h(ReplayPanel, {
          timeline,
          currentEvent,
          currentEventIndex: displaySession.eventIndex,
          perspectiveId: displaySession.perspectiveId,
          victoryTarget,
          open: displaySession.panelOpen,
          mobileOpen: displaySession.mobilePanelOpen,
          onOpenChange: (open) => dispatch({ type: "setPanelOpen", open }),
          onMobileOpenChange: (open) =>
            dispatch({ type: "setMobilePanelOpen", open }),
          onPerspectiveChange: (perspectiveId) =>
            dispatch({ type: "setPerspective", perspectiveId }),
          onResultsOpen: () => dispatch({ type: "openResults" }),
          onPreviousEvent: previousEvent,
          onNextEvent: nextEvent,
          onPreviousTurn: previousTurn,
          onNextTurn: nextTurn,
          onSeek: seekReplayEvent,
        })
      : null
  );
}
