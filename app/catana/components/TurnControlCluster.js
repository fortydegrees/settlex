import React from "react";
import { ForwardIcon } from "@heroicons/react/24/outline";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

export function TurnControlCluster({
  mode = "inactive",
  statusText = null,
  timerText = null,
  showTimer = false,
  rollContent = null,
  onRoll,
  onEndTurn,
}) {
  const showTimerChip = showTimer && Boolean(timerText);
  const isRoll = mode === "roll";
  const isEndTurn = mode === "endTurn";
  const isInactive = mode === "inactive";

  const buttonLabel = isRoll
    ? "Roll dice"
    : isEndTurn
      ? "End turn"
      : "Turn action unavailable";

  const handleClick = isRoll ? onRoll : isEndTurn ? onEndTurn : undefined;
  const buttonClassName = joinClassNames(
    "turn-control-cluster__button flex h-24 w-24 items-center justify-center rounded-[1.75rem] border-0 shadow-xl ring-2 backdrop-blur-sm transition-all",
    isInactive
      ? "cursor-not-allowed bg-slate-300/90 text-slate-500 ring-slate-300"
      : "bg-lime-500 text-white ring-white/70 hover:bg-lime-400 hover:scale-[1.02]"
  );
  const statusChipClassName = joinClassNames(
    "turn-control-chip turn-control-chip--status rounded-2xl bg-white/72 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-white/60 backdrop-blur-sm",
    !showTimerChip && "turn-control-chip--status-top"
  );

  const buttonChildren = isRoll
    ? React.createElement(
        "span",
        {
          className:
            "turn-control-cluster__button-roll flex items-center justify-center gap-1",
        },
        rollContent
      )
    : React.createElement(ForwardIcon, {
        className: "turn-control-cluster__button-icon h-11 w-11 stroke-[1.75]",
      });

  return React.createElement(
    "div",
    {
      className: "pointer-events-auto flex items-end gap-3",
      "data-turn-control-mode": mode,
      "data-allow-interaction": "true",
    },
    React.createElement(
      "div",
      { className: "flex min-w-[9rem] flex-col items-end gap-2" },
      showTimerChip
        ? React.createElement(
            "div",
            {
              className:
                "turn-control-chip turn-control-chip--timer rounded-2xl bg-white/80 px-4 py-2 text-lg font-bold text-slate-800 shadow-lg ring-1 ring-white/70 backdrop-blur-sm tabular-nums",
            },
            timerText
          )
        : null,
      statusText
        ? React.createElement(
            "div",
            { className: statusChipClassName },
            statusText
          )
        : null
    ),
    React.createElement(
      "button",
      {
        type: "button",
        "aria-label": buttonLabel,
        disabled: isInactive,
        onClick: handleClick,
        className: buttonClassName,
      },
      buttonChildren
    )
  );
}
