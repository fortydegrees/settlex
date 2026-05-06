import React from "react";
import { ForwardIcon } from "@heroicons/react/24/outline";
import "./TurnControlCluster.css";

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

const TIMER_SEGMENT_LOW_STYLE = {
  background:
    "linear-gradient(180deg, rgba(244,63,94,0.46), rgba(225,29,72,0.26)), linear-gradient(90deg, rgba(255,255,255,0.08), rgba(244,63,94,0.24))",
  boxShadow:
    "inset 1px 0 0 rgba(255,255,255,0.28), 0 0 22px rgba(244,63,94,0.28)",
};

const ACTIVE_TEXT_STYLE = {
  color: "rgba(255,255,255,0.96)",
  textShadow: "0 1px 1px rgba(15,23,42,0.28)",
};

const LOW_TIMER_TEXT_STYLE = {
  color: "rgba(255,241,242,0.98)",
  textShadow:
    "0 1px 1px rgba(15,23,42,0.26), 0 0 10px rgba(244,63,94,0.54)",
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

const DICE_TRAY_STYLE = {
  background: "transparent",
  boxShadow: "none",
};

export function TurnControlCluster({
  mode = "inactive",
  statusText = null,
  timerText = null,
  showTimer = false,
  isTimerLow = false,
  rollContent = null,
  onRoll,
  onEndTurn,
}) {
  const isRoll = mode === "roll";
  const isEndTurn = mode === "endTurn";
  const showDice = Boolean(rollContent);

  const buttonShellStyle = isEndTurn
    ? BUTTON_SHELL_ACTIVE_STYLE
    : BUTTON_SHELL_IDLE_STYLE;
  const buttonStyle = isEndTurn
    ? BUTTON_CORE_END_TURN_STYLE
    : BUTTON_CORE_STANDBY_STYLE;

  const buttonClassName = joinClassNames(
    "turn-control-cluster__button turn-control-cluster__button-core flex h-full w-full items-center justify-center rounded-[1.3rem] border-0 transition-all",
    isEndTurn
      ? "turn-control-cluster__button-core--end-turn hover:scale-[1.02]"
      : "turn-control-cluster__button-core--standby cursor-not-allowed disabled:opacity-100"
  );

  return React.createElement(
    "div",
    {
      className:
        "pointer-events-auto flex flex-col items-end gap-4",
      "data-turn-control-mode": mode,
      "data-allow-interaction": "true",
    },
    React.createElement(TurnStatusStrip, {
      mode,
      statusText,
      timerText,
      showTimer,
      isTimerLow,
    }),
    React.createElement(
      "div",
      {
        className:
          "turn-control-cluster__control-row flex items-center justify-end gap-5",
      },
      showDice
        ? React.createElement(
            "button",
            {
              type: "button",
              "aria-label": isRoll ? "Roll dice" : "Dice result",
              disabled: !isRoll,
              onClick: isRoll ? onRoll : undefined,
              className: joinClassNames(
                "turn-control-cluster__dice flex h-[5.35rem] min-w-[9.4rem] items-center justify-center overflow-hidden rounded-[1.45rem] border-0 px-4 py-2 disabled:cursor-default disabled:opacity-100",
                isRoll && "turn-control-cluster__dice--rollable"
              ),
              style: DICE_TRAY_STYLE,
            },
            React.createElement(
              "span",
              {
                className: joinClassNames(
                  "turn-control-cluster__dice-content flex items-center justify-center gap-6",
                  !isRoll && "turn-control-cluster__dice-content--disabled"
                ),
              },
              rollContent
            )
          )
        : null,
      React.createElement(
        "div",
        {
          className:
            "turn-control-cluster__button-rail relative flex h-[5.35rem] w-[5.35rem] items-center justify-center",
        },
        React.createElement(
          "div",
          {
            className:
              "turn-control-cluster__button-shell flex h-[5.35rem] w-[5.35rem] items-center justify-center rounded-[1.6rem] p-[0.45rem]",
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
                "turn-control-cluster__button-icon h-9 w-9 stroke-[1.45]",
            })
          )
        )
      )
    )
  );
}

export function TurnStatusStrip({
  mode = "inactive",
  statusText = null,
  timerText = null,
  showTimer = false,
  isTimerLow = false,
}) {
  const showTimerChip = showTimer && Boolean(timerText);
  const showLowTimer = showTimerChip && isTimerLow;
  const isInactive = mode === "inactive";

  if (!statusText && !showTimerChip) return null;

  const stripClassName = joinClassNames(
    "turn-control-strip flex min-h-[3.45rem] max-w-[21rem] items-stretch overflow-hidden rounded-[1.35rem]",
    showTimerChip ? "min-w-[16.5rem]" : "min-w-[11rem]",
    !showTimerChip && "turn-control-strip--no-timer",
    isInactive && "turn-control-strip--inactive"
  );

  const stripStyle = isInactive ? STRIP_INACTIVE_STYLE : STRIP_ACTIVE_STYLE;
  const stripTextStyle = isInactive ? INACTIVE_TEXT_STYLE : ACTIVE_TEXT_STYLE;

  return React.createElement(
    "div",
    {
      className: stripClassName,
      style: stripStyle,
      "data-turn-status-mode": mode,
    },
    statusText
      ? React.createElement(
          "div",
          {
            className: joinClassNames(
              "turn-control-strip__status flex min-w-0 flex-1 items-center px-4 py-2 text-[0.9rem] font-semibold leading-tight",
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
            className: joinClassNames(
              "turn-control-strip__timer flex min-w-[4.9rem] items-center justify-center px-3 text-[0.95rem] font-semibold tracking-[0.01em] tabular-nums",
              showLowTimer &&
                "turn-control-strip__timer--low turn-control-timer-low-pulse"
            ),
            style: {
              ...(showLowTimer ? TIMER_SEGMENT_LOW_STYLE : TIMER_SEGMENT_STYLE),
              ...stripTextStyle,
              ...(showLowTimer ? LOW_TIMER_TEXT_STYLE : null),
            },
          },
          timerText
        )
      : null
  );
}
