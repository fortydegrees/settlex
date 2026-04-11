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
  const rootClassName = joinClassNames(
    "pointer-events-auto flex gap-4",
    showTimerChip ? "items-end" : "items-center"
  );
  const leftColumnClassName = joinClassNames(
    "flex min-w-[17rem] max-w-[21rem] flex-col gap-2",
    showTimerChip ? "items-end" : "justify-center"
  );

  const buttonLabel = isRoll
    ? "Roll dice"
    : isEndTurn
      ? "End turn"
      : "Turn action unavailable";

  const handleClick = isRoll ? onRoll : isEndTurn ? onEndTurn : undefined;
  const buttonClassName = joinClassNames(
    "turn-control-cluster__button flex h-28 w-28 items-center justify-center rounded-[2.2rem] border-0 shadow-[0_18px_36px_rgba(15,23,42,0.18)] ring-2 backdrop-blur-sm transition-all",
    isRoll
      ? "bg-white/88 text-sky-900 ring-white/80 hover:bg-white/95 hover:scale-[1.02]"
      : isEndTurn
        ? "bg-lime-500/95 text-white ring-white/70 hover:bg-lime-400 hover:scale-[1.02]"
        : "cursor-not-allowed bg-slate-200/65 text-slate-500 ring-white/45"
  );
  const statusChipClassName = joinClassNames(
    "turn-control-chip turn-control-chip--status min-h-[4.25rem] w-full rounded-[2rem] px-6 py-3 text-[1.05rem] font-bold tracking-[-0.01em] text-slate-800 shadow-[0_14px_30px_rgba(15,23,42,0.12)] ring-1 backdrop-blur-sm",
    isInactive
      ? "bg-white/10 ring-white/45"
      : "bg-white/74 ring-white/60",
    !showTimerChip && "turn-control-chip--status-top"
  );
  const timerChipClassName = joinClassNames(
    "turn-control-chip turn-control-chip--timer min-w-[6.5rem] self-end rounded-[1.45rem] px-4 py-2 text-right text-[1.1rem] font-extrabold tracking-[0.01em] text-slate-800 shadow-[0_12px_24px_rgba(15,23,42,0.12)] ring-1 ring-white/65 backdrop-blur-sm tabular-nums",
    isInactive ? "bg-white/14" : "bg-white/78"
  );

  const buttonChildren = isRoll
    ? React.createElement(
        "span",
        {
          className:
            "turn-control-cluster__button-roll flex items-center justify-center gap-1.5 scale-[1.05]",
        },
        rollContent
      )
    : React.createElement(ForwardIcon, {
        className:
          "turn-control-cluster__button-icon h-12 w-12 stroke-[1.7]",
      });

  return React.createElement(
    "div",
    {
      className: rootClassName,
      "data-turn-control-mode": mode,
      "data-allow-interaction": "true",
    },
    React.createElement(
      "div",
      { className: leftColumnClassName },
      showTimerChip
        ? React.createElement(
            "div",
            {
              className: timerChipClassName,
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
