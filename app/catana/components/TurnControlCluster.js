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
  const isActive = isRoll || isEndTurn;
  const rootClassName = joinClassNames(
    "pointer-events-auto flex gap-3",
    showTimerChip ? "items-end" : "items-center"
  );
  const leftColumnClassName = joinClassNames(
    "flex min-w-[18.5rem] max-w-[22rem] flex-col gap-2.5",
    showTimerChip ? "items-end" : "justify-center"
  );

  const buttonLabel = isRoll
    ? "Roll dice"
    : isEndTurn
      ? "End turn"
      : "Turn action unavailable";

  const handleClick = isRoll ? onRoll : isEndTurn ? onEndTurn : undefined;
  const buttonShellClassName = joinClassNames(
    "turn-control-cluster__button-shell rounded-[2.15rem] p-2 backdrop-blur-sm transition-all",
    isActive
      ? "bg-amber-400/95 shadow-[0_18px_45px_rgba(251,191,36,0.34)] ring-1 ring-amber-200/70"
      : "bg-white/10 shadow-[0_18px_40px_rgba(37,99,235,0.16)] ring-1 ring-white/[0.14]"
  );
  const buttonClassName = joinClassNames(
    "turn-control-cluster__button flex h-28 w-28 items-center justify-center rounded-[1.7rem] border-0 backdrop-blur-sm transition-all",
    isActive
      ? "bg-lime-500 text-white shadow-[inset_0_-10px_0_rgba(77,124,15,0.28),0_16px_34px_rgba(77,124,15,0.22)] ring-1 ring-lime-200/80 hover:bg-lime-400 hover:scale-[1.02]"
      : "cursor-not-allowed bg-white/[0.08] text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] ring-1 ring-white/[0.12]"
  );
  const statusChipClassName = joinClassNames(
    "turn-control-chip turn-control-chip--status flex min-h-[4.25rem] w-full items-center justify-center rounded-[1.75rem] px-6 py-3 text-center text-[1rem] font-semibold leading-tight shadow-[0_14px_30px_rgba(15,23,42,0.14)] ring-1 backdrop-blur-sm",
    isInactive
      ? "bg-white/[0.18] text-slate-600 ring-white/[0.18]"
      : "bg-white/[0.84] text-slate-700 ring-white/[0.72]",
    !showTimerChip && "turn-control-chip--status-top"
  );
  const timerChipClassName = joinClassNames(
    "turn-control-chip turn-control-chip--timer min-w-[6.5rem] self-end rounded-[1.35rem] bg-white/[0.9] px-4 py-2 text-right text-[1.08rem] font-semibold tracking-[0.01em] text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.12)] ring-1 ring-white/75 backdrop-blur-sm tabular-nums"
  );

  const buttonChildren = isRoll
    ? React.createElement(
        "span",
        {
          className:
            "turn-control-cluster__button-roll flex items-center justify-center gap-1.5 scale-[1.08]",
        },
        rollContent
      )
    : React.createElement(ForwardIcon, {
        className:
          "turn-control-cluster__button-icon h-12 w-12 stroke-[1.55]",
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
      "div",
      { className: buttonShellClassName },
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
    )
  );
}
