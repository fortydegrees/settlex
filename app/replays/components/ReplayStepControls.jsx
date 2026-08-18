"use client";

import React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../../ui/Button";
import { Tooltip, TooltipProvider } from "../../ui/Tooltip";
import { getReplayRailOffset } from "./replayPanelLayout";

const railThumbClassName = [
  "[&::-webkit-slider-runnable-track]:bg-transparent",
  "[&::-webkit-slider-thumb]:h-[17px] [&::-webkit-slider-thumb]:w-[17px]",
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white",
  "[&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer",
  "[&::-webkit-slider-thumb]:shadow-[0_6px_16px_-8px_rgba(15,23,42,0.5)]",
  "[&::-moz-range-track]:bg-transparent",
  "[&::-moz-range-thumb]:h-[17px] [&::-moz-range-thumb]:w-[17px]",
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px]",
  "[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-amber-400",
  "[&::-moz-range-thumb]:cursor-pointer",
  "[&::-moz-range-thumb]:shadow-[0_6px_16px_-8px_rgba(15,23,42,0.5)]",
].join(" ");

const ReplayChevron = ({ direction, double = false }) => {
  const Icon = direction === "left" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <span
      className={`inline-flex items-center ${
        double ? "-space-x-2" : ""
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
      <span className="inline-flex items-center justify-center gap-1">
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
  // `cn` concatenates rather than merges, so a bare `rounded-xl` here loses to
  // the variant's own `rounded-[1.2rem]` on stylesheet order alone. The design
  // asks for a 12px corner on all four controls, so force it.
  const eventButtonClassName = compact
    ? "h-11 min-h-11 w-11 !rounded-[1rem] p-0"
    : touchLabels
      ? "h-11 min-h-11 min-w-0 flex-1 !rounded-xl px-1 text-[0.7rem]"
      : "h-10 min-h-10 min-w-0 flex-1 !rounded-xl px-2";
  // Ghost resting state is fully transparent, which leaves the turn jumps
  // reading as loose glyphs beside the raised event buttons. The design gives
  // them a faint fill so they still read as squares one step down the hierarchy.
  // The tray sits on a near-opaque light sheet where a 20% white fill vanishes,
  // so it takes a heavier fill and a slate hairline instead.
  const turnButtonClassName = touchLabels
    ? "h-11 min-h-11 min-w-0 flex-1 !rounded-xl !border-slate-400/30 !bg-white/70 px-1 text-[0.7rem]"
    : "h-10 min-h-10 w-10 shrink-0 !rounded-xl !border-white/40 !bg-white/20 p-0";

  return (
    <div
      className={compact ? "flex items-center gap-2" : "space-y-3"}
      data-replay-step-controls="true"
    >
      {!compact ? (
        <label className="block">
          <span className="sr-only">Seek through the match</span>
          <div className="relative flex h-[1.375rem] items-center">
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/50 shadow-[inset_0_1px_2px_rgba(15,23,42,0.14)]"
              aria-hidden="true"
            >
              <div
                data-replay-rail-fill="true"
                className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(180deg,#a3e635,#84cc16)]"
                style={{ width: getReplayRailOffset(progressRatio) }}
              />
              {turnStarts.slice(1).map((item) => (
                <span
                  key={`${item.turn}-${item.eventIndex}`}
                  data-replay-turn-marker="true"
                  className="absolute -bottom-[3px] -top-[3px] w-0.5 -translate-x-1/2 rounded-[2px] bg-white/80"
                  style={{
                    left: getReplayRailOffset(item.eventIndex / railSpan),
                  }}
                />
              ))}
            </div>
            <input
              className={`relative z-10 m-0 h-[1.375rem] w-full cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 ${railThumbClassName}`}
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
        <div className="flex items-center justify-center gap-2">
          {!compact ? (
            <ReplayControlButton
              label="Previous turn"
              direction="left"
              double
              disabled={atStart}
              onClick={onPreviousTurn}
              variant="ghost"
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
              variant="ghost"
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
