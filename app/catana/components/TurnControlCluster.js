import React from "react";
import { ForwardIcon } from "@heroicons/react/24/outline";
import { useLiveTurnTimer } from "./LiveTurnTimer";
import "./TurnControlCluster.css";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

function TurnTimerSegment({
  timerSnapshot,
  statusType,
  statusKind,
}) {
  const { timerText, isLowTimerAlertActive } = useLiveTurnTimer({
    timerSnapshot,
    enabled: true,
    statusType,
    statusKind,
  });
  const showLowTimer = Boolean(timerText) && isLowTimerAlertActive;

  return React.createElement(
    "div",
    {
      className: joinClassNames(
        "turn-control-strip__timer flex min-w-[4.9rem] items-center justify-center px-ui-3 type-hud-timer-desktop tabular-nums",
        showLowTimer &&
          "turn-control-strip__timer--low turn-control-timer-low-pulse"
      ),
      "data-low-timer": showLowTimer ? "true" : "false",
    },
    timerText
  );
}

export function TurnControlCluster({
  mode = "inactive",
  statusText = null,
  timerSnapshot = null,
  showTimer = false,
  timerStatusType,
  timerStatusKind,
  rollContent = null,
  onRoll,
  onEndTurn,
}) {
  const isRoll = mode === "roll";
  const isEndTurn = mode === "endTurn";
  const showDice = Boolean(rollContent);

  const buttonClassName = joinClassNames(
    "turn-control-cluster__button turn-control-cluster__button-core flex h-full w-full items-center justify-center rounded-panel border-0 transition-all",
    isEndTurn
      ? "turn-control-cluster__button-core--end-turn hover:scale-[1.02]"
      : "turn-control-cluster__button-core--standby cursor-not-allowed disabled:opacity-100"
  );

  return React.createElement(
    "div",
    {
      className:
        "pointer-events-auto flex flex-col items-end gap-ui-4",
      "data-turn-control-mode": mode,
      "data-allow-interaction": "true",
    },
    React.createElement(TurnStatusStrip, {
      mode,
      statusText,
      timerSnapshot,
      showTimer,
      timerStatusType,
      timerStatusKind,
    }),
    React.createElement(
      "div",
      {
        className:
          "turn-control-cluster__control-row flex items-center justify-end gap-ui-5",
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
                "turn-control-cluster__dice flex h-[5.35rem] min-w-[9.4rem] items-center justify-center overflow-hidden rounded-panel border-0 px-ui-4 py-ui-2 disabled:cursor-default disabled:opacity-100",
                isRoll && "turn-control-cluster__dice--rollable"
              ),
            },
            React.createElement(
              "span",
              {
                className: joinClassNames(
                  "turn-control-cluster__dice-content flex items-center justify-center gap-ui-6",
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
              "turn-control-cluster__button-shell flex h-[5.35rem] w-[5.35rem] items-center justify-center rounded-panel",
            "data-active": isEndTurn ? "true" : "false",
          },
          React.createElement(
            "button",
            {
              type: "button",
              "aria-label": isEndTurn ? "End turn" : "End turn unavailable",
              disabled: !isEndTurn,
              onClick: isEndTurn ? onEndTurn : undefined,
              className: buttonClassName,
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
  timerSnapshot = null,
  showTimer = false,
  timerStatusType,
  timerStatusKind,
}) {
  const showTimerChip = showTimer && Boolean(timerSnapshot);
  const isInactive = mode === "inactive";

  if (!statusText && !showTimerChip) return null;

  const stripClassName = joinClassNames(
    "turn-control-strip flex min-h-[3.45rem] max-w-[21rem] items-stretch overflow-hidden rounded-panel",
    showTimerChip ? "min-w-[16.5rem]" : "min-w-[11rem]",
    !showTimerChip && "turn-control-strip--no-timer",
    isInactive && "turn-control-strip--inactive"
  );

  return React.createElement(
    "div",
    {
      className: stripClassName,
      "data-turn-status-mode": mode,
    },
    statusText
      ? React.createElement(
          "div",
          {
            className: joinClassNames(
              "turn-control-strip__status flex min-w-0 flex-1 items-center px-ui-4 py-ui-2 type-hud-status-desktop",
              showTimerChip ? "text-left" : "justify-center text-center"
            ),
          },
          statusText
        )
      : null,
    showTimerChip
      ? React.createElement(TurnTimerSegment, {
          timerSnapshot,
          statusType: timerStatusType,
          statusKind: timerStatusKind,
        })
      : null
  );
}
