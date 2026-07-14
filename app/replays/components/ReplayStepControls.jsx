"use client";

import React from "react";
import { BackwardIcon, ForwardIcon } from "@heroicons/react/24/solid";
import { Button } from "../../ui/Button";
import { IconButton } from "../../ui/IconButton";

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
}) {
  const atStart = currentEventIndex <= 0;
  const atEnd = currentEventIndex >= Math.max(eventCount - 1, 0);

  return (
    <div
      className={compact ? "flex items-center gap-2" : "space-y-3"}
      data-replay-step-controls="true"
    >
      <div className="flex items-center justify-center gap-2">
        <IconButton
          size="sm"
          variant="secondary"
          aria-label="Previous event"
          onClick={onPreviousEvent}
          disabled={atStart}
        >
          <BackwardIcon className="h-4 w-4" aria-hidden="true" />
        </IconButton>
        <IconButton
          size="sm"
          variant="secondary"
          aria-label="Next event"
          onClick={onNextEvent}
          disabled={atEnd}
        >
          <ForwardIcon className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>

      {!compact ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="subtle"
              onClick={onPreviousTurn}
              disabled={atStart}
            >
              Previous turn
            </Button>
            <Button
              size="sm"
              variant="subtle"
              onClick={onNextTurn}
              disabled={atEnd}
            >
              Next turn
            </Button>
          </div>

          <label className="block text-xs font-semibold text-slate-600">
            <span className="flex justify-between gap-3">
              <span>Timeline</span>
              <span className="tabular-nums">
                {currentEventIndex + 1}/{Math.max(eventCount, 1)}
              </span>
            </span>
            <div className="relative mt-2">
              <input
                className="relative z-10 w-full cursor-pointer accent-lime-500"
                type="range"
                min="0"
                max={Math.max(eventCount - 1, 0)}
                value={currentEventIndex}
                onChange={(event) => onSeek(Number(event.target.value))}
              />
              <div
                className="pointer-events-none absolute inset-x-2 top-1/2 h-2 -translate-y-1/2"
                aria-hidden="true"
              >
                {turnStarts.slice(1).map((item) => (
                  <span
                    key={`${item.turn}-${item.eventIndex}`}
                    data-replay-turn-marker="true"
                    className="absolute top-0 h-2 w-px bg-slate-500/45"
                    style={{
                      left: `${
                        (item.eventIndex / Math.max(eventCount - 1, 1)) * 100
                      }%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </label>
        </>
      ) : null}
    </div>
  );
}
