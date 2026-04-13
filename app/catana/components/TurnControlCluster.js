import React from "react";
import { ForwardIcon } from "@heroicons/react/24/outline";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

const STRIP_ACTIVE_STYLE = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04)), linear-gradient(90deg, rgba(255,255,255,0.26), rgba(191,219,254,0.16), rgba(147,197,253,0.12))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.2), 0 14px 26px rgba(37,99,235,0.1)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

const STRIP_INACTIVE_STYLE = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03)), linear-gradient(90deg, rgba(255,255,255,0.18), rgba(191,219,254,0.1), rgba(147,197,253,0.08))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 12px 24px rgba(37,99,235,0.07)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

const TIMER_SEGMENT_STYLE = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02)), linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.08))",
  boxShadow: "inset 1px 0 0 rgba(255,255,255,0.16)",
};

const ACTIVE_TEXT_STYLE = {
  color: "rgba(255,255,255,0.96)",
  textShadow: "0 1px 1px rgba(15,23,42,0.28)",
};

const INACTIVE_TEXT_STYLE = {
  color: "rgba(255,255,255,0.72)",
  textShadow: "0 1px 1px rgba(15,23,42,0.2)",
};

const BUTTON_SHELL_ACTIVE_STYLE = {
  background: "rgba(147, 197, 253, 0.14)",
  boxShadow: "0 12px 24px rgba(37,99,235,0.08)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

const BUTTON_SHELL_IDLE_STYLE = {
  background: "rgba(147, 197, 253, 0.12)",
  boxShadow: "0 10px 20px rgba(37,99,235,0.06)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

const BUTTON_CORE_END_TURN_STYLE = {
  background:
    "linear-gradient(180deg, rgba(185,235,54,0.92), rgba(132,204,22,0.84))",
  boxShadow:
    "0 10px 18px rgba(132,204,22,0.12), inset 0 1px 0 rgba(255,255,255,0.28)",
  color: "rgba(255,255,255,0.9)",
};

const BUTTON_CORE_STANDBY_STYLE = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(191,219,254,0.045))",
  boxShadow:
    "0 6px 14px rgba(37,99,235,0.025), inset 0 1px 0 rgba(255,255,255,0.1)",
  color: "rgba(219,234,254,0.32)",
};

const DICE_BUTTON_STYLE = {
  background: "transparent",
  border: 0,
  padding: 0,
  boxShadow: "none",
};

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
  const showDice = isRoll && Boolean(rollContent);

  const stripClassName = joinClassNames(
    "turn-control-strip flex min-h-[5.25rem] max-w-[22rem] items-stretch overflow-hidden rounded-[1.75rem]",
    showTimerChip ? "min-w-[18.25rem]" : "min-w-[12.25rem]",
    !showTimerChip && "turn-control-strip--no-timer",
    isInactive && "turn-control-strip--inactive"
  );

  const stripStyle = isInactive ? STRIP_INACTIVE_STYLE : STRIP_ACTIVE_STYLE;
  const stripTextStyle = isInactive ? INACTIVE_TEXT_STYLE : ACTIVE_TEXT_STYLE;

  const buttonShellStyle = isEndTurn
    ? BUTTON_SHELL_ACTIVE_STYLE
    : BUTTON_SHELL_IDLE_STYLE;
  const buttonStyle = isEndTurn
    ? BUTTON_CORE_END_TURN_STYLE
    : BUTTON_CORE_STANDBY_STYLE;

  const buttonClassName = joinClassNames(
    "turn-control-cluster__button turn-control-cluster__button-core flex h-full w-full items-center justify-center rounded-[1.5rem] border-0 transition-all",
    isEndTurn
      ? "turn-control-cluster__button-core--end-turn hover:scale-[1.02]"
      : "turn-control-cluster__button-core--standby cursor-not-allowed disabled:opacity-100"
  );

  return React.createElement(
    "div",
    {
      className: "pointer-events-auto flex translate-y-2.5 items-center gap-3",
      "data-turn-control-mode": mode,
      "data-allow-interaction": "true",
    },
    statusText || showTimerChip
      ? React.createElement(
          "div",
          {
            className: stripClassName,
            style: stripStyle,
          },
          statusText
            ? React.createElement(
                "div",
                {
                  className: joinClassNames(
                    "turn-control-strip__status flex min-w-0 flex-1 items-center px-6 py-3 text-[1rem] font-semibold leading-tight",
                    showTimerChip ? "text-left" : "justify-center text-center"
                  ),
                  style: stripTextStyle,
                },
                statusText
              )
            : null,
          showTimerChip
            ? React.createElement(
                "div",
                {
                  className:
                    "turn-control-strip__timer flex min-w-[5.9rem] items-center justify-center px-4 text-[1.05rem] font-semibold tracking-[0.01em] tabular-nums",
                  style: {
                    ...TIMER_SEGMENT_STYLE,
                    ...stripTextStyle,
                  },
                },
                timerText
              )
            : null
        )
      : null,
    React.createElement(
      "div",
      {
        className:
          "turn-control-cluster__button-rail relative flex h-[6.5rem] w-[6.5rem] items-center justify-center",
      },
      showDice
        ? React.createElement(
            "button",
            {
              type: "button",
              "aria-label": "Roll dice",
              onClick: onRoll,
              className:
                "turn-control-cluster__dice absolute bottom-[calc(100%+0.65rem)] left-1/2 flex -translate-x-1/2 items-center gap-4 border-0 p-0 transition-transform hover:scale-[1.02]",
              style: DICE_BUTTON_STYLE,
            },
            rollContent
          )
        : null,
      React.createElement(
        "div",
        {
          className:
            "turn-control-cluster__button-shell flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-[1.9rem] p-[0.55rem]",
          style: buttonShellStyle,
        },
        React.createElement(
          "button",
          {
            type: "button",
            "aria-label": isEndTurn ? "End turn" : "End turn unavailable",
            disabled: !isEndTurn,
            onClick: isEndTurn ? onEndTurn : undefined,
            className: buttonClassName,
            style: buttonStyle,
          },
          React.createElement(ForwardIcon, {
            className:
              "turn-control-cluster__button-icon h-10 w-10 stroke-[1.45]",
          })
        )
      )
    )
  );
}
