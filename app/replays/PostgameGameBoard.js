"use client";

import {
  Fragment,
  createElement as h,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { GameScreenWithEffects } from "../catana/GameScreen";
import { ReplayConsole } from "./components/ReplayConsole";
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
  const bgioProps = archivedMode ? {} : props;
  const liveGameOver = Boolean(
    bgioProps.ctx?.gameover ?? bgioProps.G?.core?.gameOver
  );
  const replayPayload = usePostgameReplayPayload({
    matchID: bgioProps.matchID,
    enabled: !archivedMode && liveGameOver,
    initialPayload: initialReplayPayload,
  });
  const {
    status: replayPayloadStatus,
    retry: retryReplayPayload,
  } = replayPayload;
  const replay = replayPayload.payload?.replay ?? null;
  const safeFrames = useMemo(() => {
    const frames = replayPayload.payload?.frames ?? [];
    if (frames.length > 0) return frames;
    if (!replay?.initialState) return [];
    return [{ index: 0, state: replay.initialState, logEntry: null }];
  }, [replay, replayPayload.payload?.frames]);
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
      eventIndex: archivedInitialEventIndex,
    })
  );
  const [activation, dispatchActivation] = useReducer(
    replayActivationReducer,
    { replayActive: archivedMode },
    createReplayActivationState
  );
  const replayActive = activation.replayActive;
  const liveReplayStartedRef = useRef(archivedMode);
  const [mobileReplayOpen, setMobileReplayOpen] = useState(false);

  const seekReplayEvent = useCallback(
    (eventIndex) => dispatch({ type: "seek", eventIndex }),
    []
  );
  const previousEvent = useCallback(
    () => seekReplayEvent(session.eventIndex - 1),
    [seekReplayEvent, session.eventIndex]
  );
  const nextEvent = useCallback(
    () => seekReplayEvent(session.eventIndex + 1),
    [seekReplayEvent, session.eventIndex]
  );
  const previousTurn = useCallback(
    () =>
      seekReplayEvent(
        getPreviousTurnEventIndex(session.eventIndex, timeline.turnStarts)
      ),
    [seekReplayEvent, session.eventIndex, timeline.turnStarts]
  );
  const nextTurn = useCallback(
    () =>
      seekReplayEvent(
        getNextTurnEventIndex(
          session.eventIndex,
          timeline.turnStarts,
          timeline.events.length - 1
        )
      ),
    [
      seekReplayEvent,
      session.eventIndex,
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
    });
    if (replayPayloadStatus === "error") {
      retryReplayPayload();
    }
  }, [replayPayloadStatus, retryReplayPayload]);

  useEffect(() => {
    if (replayPayloadStatus !== "ready") return;
    dispatchActivation({ type: "payloadReady" });
  }, [replayPayloadStatus]);

  useEffect(() => {
    if (!replayActive || liveReplayStartedRef.current) return;
    liveReplayStartedRef.current = true;
    dispatch({
      type: "startReplay",
      eventCount: timeline.events.length,
      perspectiveId: bgioProps.playerID,
      eventIndex: 0,
    });
  }, [bgioProps.playerID, replayActive, timeline.events.length]);

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
    timeline.events[session.eventIndex] ?? timeline.events[0] ?? null;
  const matchID =
    replay?.match?.bgioMatchId ?? replay?.match?.replayId ?? bgioProps.matchID;
  const displayProps = replayActive
    ? {
        ...buildReplayGameScreenProps({
          event: currentEvent,
          perspectiveId: session.perspectiveId,
          matchID,
          matchData: replayMatchData,
          resultsOpen: session.resultsOpen,
        }),
        chatMessages,
        onReplayResultsOpen: () => dispatch({ type: "openResults" }),
        onReplayResultsClose: () => dispatch({ type: "closeResults" }),
        onReplayLogEntrySelect: handleReplayLogEntrySelect,
        replayConsoleMobileOpen: mobileReplayOpen,
        onReplayMobileMetaPanelOpen: () => setMobileReplayOpen(false),
      }
    : {
        ...bgioProps,
        postgameReplayStatus: replayPayloadStatus,
        onWatchReplay: handleOpenReplay,
      };
  const victoryTarget =
    currentEvent?.state?.G?.core?.ruleset?.victoryPointsToWin ?? 10;

  return h(
    Fragment,
    null,
    h(GameScreenWithEffects, displayProps),
    replayActive
      ? h(ReplayConsole, {
          timeline,
          currentEvent,
          currentEventIndex: session.eventIndex,
          victoryTarget,
          mobileOpen: mobileReplayOpen,
          onMobileOpenChange: setMobileReplayOpen,
          onPreviousEvent: previousEvent,
          onNextEvent: nextEvent,
          onPreviousTurn: previousTurn,
          onNextTurn: nextTurn,
          onSeek: seekReplayEvent,
        })
      : null
  );
}
