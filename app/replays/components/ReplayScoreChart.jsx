"use client";

import React, { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { getPlayerNameHex } from "../../catana/theme/playerColors";

const FALLBACK_COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#a855f7"];
const PLOT_LEFT = 30;
const PLOT_RIGHT = 8;

const getPlayerChartColor = (player, playerIndex) =>
  getPlayerNameHex(player.color) ??
  FALLBACK_COLORS[playerIndex % FALLBACK_COLORS.length];

export const getReplayEventIndexAtChartX = ({
  clientX,
  rectLeft,
  rectWidth,
  eventCount,
}) => {
  const finalEventIndex = Math.max(eventCount - 1, 0);
  const plotWidth = Math.max(rectWidth - PLOT_LEFT - PLOT_RIGHT, 1);
  const ratio = Math.min(
    Math.max((clientX - rectLeft - PLOT_LEFT) / plotWidth, 0),
    1
  );
  return Math.round(ratio * finalEventIndex);
};

export const getReplayChartKeyboardSeekIndex = ({
  key,
  currentEventIndex,
  eventCount,
}) => {
  const finalEventIndex = Math.max(eventCount - 1, 0);
  if (key === "Home") return 0;
  if (key === "End") return finalEventIndex;
  const isDecrement = key === "ArrowLeft" || key === "ArrowDown";
  const isIncrement = key === "ArrowRight" || key === "ArrowUp";
  if (!isDecrement && !isIncrement) return null;
  const direction = isDecrement ? -1 : 1;
  return Math.min(
    Math.max(currentEventIndex + direction, 0),
    finalEventIndex
  );
};

// The series simply stop at the playhead, which on its own reads as "the match
// ended here". Hatching the rest of the plot says the opposite — there is more,
// it just hasn't been replayed yet — without leaking who ends up ahead.
export const getReplayChartClipStyle = ({
  currentEventIndex = 0,
  eventCount = 0,
}) => {
  const finalEventIndex = Math.max(eventCount - 1, 0);
  const ratio =
    finalEventIndex === 0
      ? 1
      : Math.min(Math.max(currentEventIndex / finalEventIndex, 0), 1);
  return {
    left: `calc(${PLOT_LEFT}px + ${ratio} * (100% - ${
      PLOT_LEFT + PLOT_RIGHT
    }px))`,
    right: `${PLOT_RIGHT}px`,
  };
};

export const getVisibleReplayScoreData = ({
  scoreSeries = [],
  turnStarts = [],
  currentEventIndex = 0,
}) => ({
  visibleScoreSeries: scoreSeries.filter(
    (sample) => sample.eventIndex <= currentEventIndex
  ),
  visibleTurnStarts: turnStarts.filter(
    (marker) => marker.eventIndex <= currentEventIndex
  ),
});

export function ReplayScoreChart({
  players = [],
  scoreSeries = [],
  turnStarts = [],
  currentEventIndex = 0,
  eventCount = scoreSeries.length,
  victoryTarget = 10,
  perspectiveId = null,
  onSeek,
}) {
  const { visibleScoreSeries, visibleTurnStarts } =
    getVisibleReplayScoreData({
      scoreSeries,
      turnStarts,
      currentEventIndex,
    });
  const currentScores =
    visibleScoreSeries.at(-1)?.scoresByPlayerId ?? {};
  const turnByEventIndex = useMemo(
    () =>
      Object.fromEntries(
        visibleTurnStarts.map((item) => [item.eventIndex, item.turn])
      ),
    [visibleTurnStarts]
  );
  const numericScores = visibleScoreSeries.flatMap((sample) =>
    Object.values(sample.scoresByPlayerId ?? {}).filter(Number.isFinite)
  );
  const maxScore = Math.max(victoryTarget, ...numericScores);
  const yTickStep = Math.max(Math.ceil(maxScore / 5), 1);
  const yTicks = Array.from(
    { length: Math.floor(maxScore / yTickStep) + 1 },
    (_, index) => index * yTickStep
  );
  if (yTicks.at(-1) !== maxScore) yTicks.push(maxScore);
  const handleChartClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onSeek?.(
      getReplayEventIndexAtChartX({
        clientX: event.clientX,
        rectLeft: rect.left,
        rectWidth: rect.width,
        eventCount,
      })
    );
  };
  const handleChartKeyDown = (event) => {
    const eventIndex = getReplayChartKeyboardSeekIndex({
      key: event.key,
      currentEventIndex,
      eventCount,
    });
    if (eventIndex == null) return;
    event.preventDefault();
    onSeek?.(eventIndex);
  };

  if (
    players.length === 0 ||
    scoreSeries.length === 0 ||
    numericScores.length === 0
  ) {
    return null;
  }

  return (
    <section aria-label="Victory points over the replay">
      <div
        className="settlex-ui-focus relative h-40 w-full cursor-pointer"
        data-replay-score-chart="true"
        role="slider"
        tabIndex={0}
        aria-label="Replay victory point timeline"
        aria-valuemin="0"
        aria-valuemax={Math.max(eventCount - 1, 0)}
        aria-valuenow={currentEventIndex}
        aria-valuetext={`Event ${currentEventIndex + 1} of ${Math.max(
          eventCount,
          1
        )}`}
        onClick={handleChartClick}
        onKeyDown={handleChartKeyDown}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={visibleScoreSeries}
            margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid
              stroke="var(--settlex-ui-chart-grid)"
              vertical={false}
            />
            <XAxis
              type="number"
              dataKey="eventIndex"
              domain={[0, Math.max(eventCount - 1, 0)]}
              ticks={visibleTurnStarts.map((item) => item.eventIndex)}
              allowDataOverflow
              tickFormatter={(eventIndex) =>
                `T${turnByEventIndex[eventIndex] ?? ""}`
              }
              tick={{ className: "settlex-ui-chart-tick" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              allowDataOverflow
              domain={[0, maxScore]}
              ticks={yTicks}
              tick={{ className: "settlex-ui-chart-tick" }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <ReferenceLine
              x={currentEventIndex}
              stroke="var(--settlex-ui-chart-cursor)"
              strokeWidth={2}
            />
            {players.map((player, playerIndex) => (
              <Line
                key={player.id}
                type="stepAfter"
                dataKey={(sample) => sample.scoresByPlayerId?.[player.id]}
                name={player.name}
                stroke={getPlayerChartColor(player, playerIndex)}
                strokeWidth={3}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div
          data-replay-chart-clip="true"
          className="settlex-ui-replay-future pointer-events-none absolute inset-y-0"
          style={{
            ...getReplayChartClipStyle({ currentEventIndex, eventCount }),
          }}
          aria-hidden="true"
        />
      </div>

      <ul className="mt-ui-2.5 space-y-ui-0.5 type-caption text-ink-secondary">
        {players.map((player, playerIndex) => {
          const isPerspective =
            (player.id ?? null) === (perspectiveId ?? null);
          return (
            <li
              key={player.id}
              className="flex min-h-[1.375rem] min-w-0 items-center gap-ui-2"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-pill"
                style={{
                  backgroundColor: getPlayerChartColor(player, playerIndex),
                }}
                aria-hidden="true"
              />
              <span
                className={`min-w-0 flex-1 truncate ${
                  isPerspective ? "type-action-small text-ink-primary" : "type-label"
                }`}
              >
                {player.name}
              </span>
              <span className="shrink-0 type-action-small tabular-nums text-ink-primary">
                {currentScores[player.id] ?? "—"} VP
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
