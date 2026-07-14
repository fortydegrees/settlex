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
  if (key !== "ArrowLeft" && key !== "ArrowRight") return null;
  const direction = key === "ArrowLeft" ? -1 : 1;
  return Math.min(
    Math.max(currentEventIndex + direction, 0),
    Math.max(eventCount - 1, 0)
  );
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
    <section aria-label="Victory points over the replay" className="mt-4">
      <div
        className="h-44 w-full cursor-pointer"
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
              stroke="rgba(100,116,139,0.2)"
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
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              allowDataOverflow
              domain={[0, maxScore]}
              ticks={yTicks}
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <ReferenceLine
              x={currentEventIndex}
              stroke="#f59e0b"
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
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-semibold text-slate-700">
        {players.map((player, playerIndex) => (
          <li key={player.id} className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: getPlayerChartColor(player, playerIndex),
              }}
              aria-hidden="true"
            />
            <span className="truncate">{player.name}</span>
            <span className="ml-auto tabular-nums">
              {currentScores[player.id] ?? "—"} VP
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
