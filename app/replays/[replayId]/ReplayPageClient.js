"use client";

import { createElement as h, useMemo, useState } from "react";
import { GameScreen } from "../../catana/GameScreen";
import { ReplayControls } from "../components/ReplayControls";
import {
  buildReplayChatMessages,
  clampReplayFrameIndex,
} from "../replayClientState";
import { CATANA_TABLE_BACKGROUND } from "../../catana/theme/backgrounds";

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));

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

const getFrameLabel = (frame) => {
  const moveType =
    frame?.logEntry?.action?.payload?.type ?? frame?.logEntry?.action?.type ?? null;
  if (!moveType) {
    return "Initial setup";
  }
  return String(moveType);
};

export const createReplayPageClient = ({
  GameScreen: GameScreenImpl = GameScreen,
  ReplayControls: ReplayControlsImpl = ReplayControls,
} = {}) =>
  function ReplayPageClient({
    replay,
    frames,
    initialFrameIndex = 0,
  }) {
    const [frameIndex, setFrameIndex] = useState(() =>
      clampReplayFrameIndex(initialFrameIndex, frames.length)
    );
  const safeFrameIndex = clampReplayFrameIndex(frameIndex, frames.length);
  const currentFrame = frames[safeFrameIndex] ?? null;
  const currentState = currentFrame?.state ?? replay.initialState;
  const matchData = useMemo(
    () => buildReplayMatchData(replay.participants ?? []),
    [replay.participants]
  );
  const chatMessages = useMemo(
    () => buildReplayChatMessages(replay.chatMessages ?? []),
    [replay.chatMessages]
  );

  const replayProps = {
    ...currentState,
    matchData,
    matchMetadata: matchData,
    matchID: replay.match.bgioMatchId ?? replay.match.replayId,
    playerID: null,
    credentials: null,
    moves: {},
    events: {},
    plugins: currentState?.plugins ?? {},
    isConnected: true,
    isMultiplayer: false,
    isReplay: true,
    chatMessages,
  };

  return h(
    "div",
    {
      className: "min-h-screen",
      style: { background: CATANA_TABLE_BACKGROUND },
    },
    h(
      "div",
      {
        className: "pointer-events-none fixed inset-x-0 top-0 z-50 p-4",
      },
      h(
        "div",
        {
          className: "pointer-events-auto mx-auto flex max-w-5xl flex-col gap-3",
        },
        h(
          "section",
          {
            className:
              "rounded-2xl bg-blue-200/90 p-4 shadow-xl ring-1 ring-white/60 backdrop-blur-sm",
          },
          h(
            "div",
            {
              className: "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
            },
            h(
              "div",
              null,
              h(
                "p",
                {
                  className:
                    "text-xs font-semibold uppercase tracking-[0.22em] text-slate-600",
                },
                "Archived replay"
              ),
              h(
                "h1",
                {
                  className: "mt-1 text-2xl font-bold text-slate-900",
                },
                replay.match.gameName
              ),
              h(
                "p",
                {
                  className: "text-sm text-slate-700",
                },
                `Finished ${formatDate(replay.match.finishedAt)} · ${replay.match.playerCount} players`
              )
            ),
            h(
              "p",
              {
                className:
                  "rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-white/70",
              },
              getFrameLabel(currentFrame)
            )
          )
        ),
        h(ReplayControlsImpl, {
          frameIndex: safeFrameIndex,
          frameCount: frames.length,
          onFrameChange: setFrameIndex,
          onPrevious: () => setFrameIndex((current) => Math.max(0, current - 1)),
          onNext: () =>
            setFrameIndex((current) => Math.min(frames.length - 1, current + 1)),
        })
      )
    ),
    h(GameScreenImpl, replayProps)
  );
  };

export const ReplayPageClient = createReplayPageClient();
