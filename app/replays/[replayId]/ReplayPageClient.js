"use client";

import {
  createElement as h,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { GameScreenWithEffects } from "../../catana/GameScreen";
import { CATANA_TABLE_BACKGROUND } from "../../catana/theme/backgrounds";
import { ReplayConsole } from "../components/ReplayConsole";
import {
  buildReplayChatMessages,
  getReplayKeyboardAction,
} from "../replayClientState";
import {
  buildReplayTimeline,
  getNextTurnEventIndex,
  getPreviousTurnEventIndex,
} from "../replayTimeline";
import { useReplayNavigation } from "../useReplayNavigation";

const buildReplayMatchData = (participants) =>
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

export const createReplayPageClient = ({
  GameScreen: GameScreenImpl = GameScreenWithEffects,
  ReplayConsole: ReplayConsoleImpl = ReplayConsole,
} = {}) =>
  function ReplayPageClient({
    replay,
    frames = [],
    initialFrameIndex = 0,
    initialPerspectivePlayerID = null,
  }) {
    const safeFrames = useMemo(
      () =>
        frames.length > 0
          ? frames
          : [
              {
                index: 0,
                state: replay.initialState,
                logEntry: null,
              },
            ],
      [frames, replay.initialState]
    );
    const timeline = useMemo(
      () =>
        buildReplayTimeline({
          frames: safeFrames,
          participants: replay.participants ?? [],
        }),
      [safeFrames, replay.participants]
    );
    const navigation = useReplayNavigation({
      eventCount: timeline.events.length,
      initialEventIndex:
        initialFrameIndex > 0 ? timeline.events.length - 1 : 0,
    });
    const currentEvent =
      timeline.events[navigation.eventIndex] ?? timeline.events[0];
    const currentFrame =
      safeFrames[currentEvent?.frameIndex ?? 0] ?? safeFrames[0];
    const currentState = currentFrame?.state ?? replay.initialState;
    const [mobileReplayOpen, setMobileReplayOpen] = useState(false);
    const matchData = useMemo(
      () => buildReplayMatchData(replay.participants ?? []),
      [replay.participants]
    );
    const chatMessages = useMemo(
      () => buildReplayChatMessages(replay.chatMessages ?? []),
      [replay.chatMessages]
    );
    const replayEventIndex = navigation.eventIndex;
    const seekReplayEvent = navigation.seek;

    const seekPreviousTurn = useCallback(
      () =>
        seekReplayEvent(
          getPreviousTurnEventIndex(
            replayEventIndex,
            timeline.turnStarts
          )
        ),
      [replayEventIndex, seekReplayEvent, timeline.turnStarts]
    );
    const seekNextTurn = useCallback(
      () =>
        seekReplayEvent(
          getNextTurnEventIndex(
            replayEventIndex,
            timeline.turnStarts,
            timeline.events.length - 1
          )
        ),
      [
        replayEventIndex,
        seekReplayEvent,
        timeline.events.length,
        timeline.turnStarts,
      ]
    );
    const handleReplayLogEntrySelect = useCallback(
      (entryKey) => {
        const nextIndex = timeline.logEventIndexByKey[String(entryKey)];
        if (Number.isInteger(nextIndex)) seekReplayEvent(nextIndex);
      },
      [seekReplayEvent, timeline.logEventIndexByKey]
    );

    useEffect(() => {
      const handleKeyDown = (event) => {
        const target = event.target;
        if (
          target?.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(
            target?.tagName
          )
        ) {
          return;
        }

        const keyboardAction = getReplayKeyboardAction(event);
        if (!keyboardAction) return;
        event.preventDefault();

        if (keyboardAction === "previousEvent") navigation.previous();
        if (keyboardAction === "nextEvent") navigation.next();
        if (keyboardAction === "previousTurn") seekPreviousTurn();
        if (keyboardAction === "nextTurn") seekNextTurn();
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
      navigation.next,
      navigation.previous,
      seekNextTurn,
      seekPreviousTurn,
    ]);

    const replayProps = {
      ...currentState,
      matchData,
      matchMetadata: matchData,
      matchID: replay.match.bgioMatchId ?? replay.match.replayId,
      playerID: initialPerspectivePlayerID,
      credentials: null,
      moves: {},
      events: {},
      plugins: currentState?.plugins ?? {},
      isConnected: true,
      isMultiplayer: false,
      isReplay: true,
      chatMessages,
      replayLogEntries: currentEvent?.visibleLogEntries ?? [],
      replayActiveLogEntryKey: currentEvent?.logEntryKey ?? null,
      onReplayLogEntrySelect: handleReplayLogEntrySelect,
      replayConsoleMobileOpen: mobileReplayOpen,
      onReplayMobileMetaPanelOpen: () => setMobileReplayOpen(false),
    };
    const victoryTarget =
      currentState?.G?.core?.ruleset?.victoryPointsToWin ?? 10;

    return h(
      "div",
      {
        className: "min-h-screen",
        style: { background: CATANA_TABLE_BACKGROUND },
      },
      h(GameScreenImpl, replayProps),
      h(ReplayConsoleImpl, {
        timeline,
        currentEvent,
        currentEventIndex: navigation.eventIndex,
        victoryTarget,
        mobileOpen: mobileReplayOpen,
        onMobileOpenChange: setMobileReplayOpen,
        onPreviousEvent: navigation.previous,
        onNextEvent: navigation.next,
        onPreviousTurn: seekPreviousTurn,
        onNextTurn: seekNextTurn,
        onSeek: navigation.seek,
      })
    );
  };

export const ReplayPageClient = createReplayPageClient();
