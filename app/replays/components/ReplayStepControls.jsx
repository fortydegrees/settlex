"use client";

import React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../../ui/Button";
import { Tooltip, TooltipProvider } from "../../ui/Tooltip";
import { getReplayRailOffset } from "./replayPanelLayout";

const ReplayChevron = ({ direction, double = false }) => {
  const Icon = direction === "left" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <span
      className={`inline-flex items-center ${
        double ? "-space-x-ui-2" : ""
      }`}
      aria-hidden="true"
    >
      <Icon className="h-4 w-4" />
      {double ? <Icon className="h-4 w-4" /> : null}
    </span>
  );
};

const ReplayControlButton = ({
  label,
  direction,
  double = false,
  disabled,
  onClick,
  variant,
  className,
  textBefore = null,
  textAfter = null,
  tooltip = false,
}) => {
  const control = (
    <Button
      size="sm"
      variant={variant}
      className={className}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="inline-flex items-center justify-center gap-ui-1">
        {textBefore}
        <ReplayChevron direction={direction} double={double} />
        {textAfter}
      </span>
    </Button>
  );

  return tooltip ? <Tooltip label={label}>{control}</Tooltip> : control;
};

export function ReplayStepControls({
  currentEventIndex,
  eventCount,
  turnStarts = [],
  onPreviousEvent,
  onNextEvent,
  onPreviousTurn,
  onNextTurn,
  onSeek,
  compact = false,
  touchLabels = false,
}) {
  const finalEventIndex = Math.max(eventCount - 1, 0);
  const railSpan = Math.max(finalEventIndex, 1);
  const progressRatio = currentEventIndex / railSpan;
  const atStart = currentEventIndex <= 0;
  const atEnd = currentEventIndex >= finalEventIndex;
  const iconOnly = !compact && !touchLabels;
  // Shared buttons own corner geometry; replay owns the compact arrangement.
  const eventButtonClassName = compact
    ? "h-11 min-h-[2.75rem] w-11 !p-ui-0"
    : touchLabels
      ? "h-11 min-h-[2.75rem] min-w-0 flex-1 !px-ui-1"
      : "h-11 min-h-[2.75rem] min-w-0 flex-1 !px-ui-2";
  const turnButtonClassName = touchLabels
    ? "h-11 min-h-[2.75rem] min-w-0 flex-1 !px-ui-1"
    : "h-11 min-h-[2.75rem] w-11 shrink-0 !p-ui-0";

  return (
    <div
      className={compact ? "flex items-center gap-ui-2" : "space-y-ui-3"}
      data-replay-step-controls="true"
    >
      {!compact ? (
        <label className="block">
          <span className="sr-only">Seek through the match</span>
          <div className="relative flex h-[1.375rem] items-center">
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-pill settlex-ui-replay-track"
              aria-hidden="true"
            >
              <div
                data-replay-rail-fill="true"
                className="absolute inset-y-0 left-0 rounded-pill settlex-ui-replay-progress"
                style={{ width: getReplayRailOffset(progressRatio) }}
              />
              {turnStarts.slice(1).map((item) => (
                <span
                  key={`${item.turn}-${item.eventIndex}`}
                  data-replay-turn-marker="true"
                  className="absolute -bottom-[3px] -top-[3px] w-0.5 -translate-x-1/2 rounded-pill settlex-ui-replay-marker"
                  style={{
                    left: getReplayRailOffset(item.eventIndex / railSpan),
                  }}
                />
              ))}
            </div>
            <input
              className="settlex-ui-replay-range relative z-10 m-ui-0 h-[1.375rem] w-full cursor-pointer appearance-none rounded-pill bg-transparent settlex-ui-focus"
              type="range"
              min="0"
              max={finalEventIndex}
              value={currentEventIndex}
              aria-label="Seek through the match"
              onChange={(event) => onSeek(Number(event.target.value))}
            />
          </div>
        </label>
      ) : null}

      <TooltipProvider delay={300}>
        <div className="flex items-center justify-center gap-ui-2">
          {!compact ? (
            <ReplayControlButton
              label="Previous turn"
              direction="left"
              double
              disabled={atStart}
              onClick={onPreviousTurn}
              variant="subtle"
              className={turnButtonClassName}
              textAfter={touchLabels ? "Turn" : null}
              tooltip={iconOnly}
            />
          ) : null}
          <ReplayControlButton
            label="Previous event"
            direction="left"
            disabled={atStart}
            onClick={onPreviousEvent}
            variant="secondary"
            className={eventButtonClassName}
            textAfter={touchLabels ? "Event" : null}
            tooltip={iconOnly}
          />
          <ReplayControlButton
            label="Next event"
            direction="right"
            disabled={atEnd}
            onClick={onNextEvent}
            variant="secondary"
            className={eventButtonClassName}
            textBefore={touchLabels ? "Event" : null}
            tooltip={iconOnly}
          />
          {!compact ? (
            <ReplayControlButton
              label="Next turn"
              direction="right"
              double
              disabled={atEnd}
              onClick={onNextTurn}
              variant="subtle"
              className={turnButtonClassName}
              textBefore={touchLabels ? "Turn" : null}
              tooltip={iconOnly}
            />
          ) : null}
        </div>
      </TooltipProvider>
    </div>
  );
}
