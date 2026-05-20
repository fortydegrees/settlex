import React from "react";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

const normalizeDiceRoll = (diceRoll) => {
  if (!Array.isArray(diceRoll) || diceRoll.length < 2) return null;
  const dice = diceRoll.slice(0, 2).map((value) => Number(value));
  if (dice.some((value) => !Number.isFinite(value) || value <= 0)) return null;
  return dice;
};

const getRollTotal = (dice) =>
  Array.isArray(dice) ? dice.reduce((total, value) => total + value, 0) : null;

export function MobileTurnContextStrip({
  mode = "inactive",
  statusText = null,
  timerText = null,
  showTimer = false,
  isTimerLow = false,
  diceRoll = null,
  activePlayerName = null,
  isViewerTurn = false,
}) {
  const dice = normalizeDiceRoll(diceRoll);
  const rollTotal = getRollTotal(dice);
  const showTimerChip = showTimer && Boolean(timerText);
  const primaryStatus = isViewerTurn
    ? statusText
    : activePlayerName || statusText;
  const waitingStatus =
    !isViewerTurn && mode === "roll" && activePlayerName
      ? `${activePlayerName} to roll`
      : primaryStatus;
  const visibleStatus = rollTotal ? primaryStatus : waitingStatus;

  if (!visibleStatus && !showTimerChip && !rollTotal) return null;

  const segments = [];
  if (isViewerTurn && showTimerChip) {
    segments.push({
      key: "timer",
      className: joinClassNames(
        "mobile-turn-context__timer tabular-nums",
        isTimerLow && "mobile-turn-context__timer--low text-rose-50"
      ),
      content: timerText,
    });
  }

  if (visibleStatus) {
    segments.push({
      key: "status",
      className: "mobile-turn-context__status min-w-0 truncate",
      content: visibleStatus,
    });
  }

  if (rollTotal) {
    segments.push({
      key: "roll",
      className: "mobile-turn-context__roll",
      content: (
        <span className="inline-flex items-center gap-2">
          <span>{`Rolled ${rollTotal}`}</span>
          <span className="inline-flex items-center gap-1" aria-hidden="true">
            {dice.map((die, index) => (
              <span
                key={`${die}-${index}`}
                className="mobile-turn-context__die flex h-6 w-6 items-center justify-center rounded-[0.5rem] bg-white/88 text-xs font-bold text-slate-900 shadow-[0_4px_10px_-6px_rgba(15,23,42,0.7)]"
              >
                {die}
              </span>
            ))}
          </span>
        </span>
      ),
    });
  }

  if (!isViewerTurn && showTimerChip) {
    segments.push({
      key: "timer",
      className: joinClassNames(
        "mobile-turn-context__timer tabular-nums",
        isTimerLow && "mobile-turn-context__timer--low text-rose-50"
      ),
      content: timerText,
    });
  }

  return (
    <div
      className={joinClassNames(
        "mobile-turn-context mt-1.5 flex min-h-[2.2rem] w-full items-center justify-center overflow-hidden rounded-[0.9rem] bg-white/[0.075] px-3 text-[0.82rem] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md",
        isTimerLow && "ring-1 ring-rose-200/40"
      )}
      data-mobile-turn-context-mode={mode}
      data-allow-interaction="true"
    >
      <div className="flex min-w-0 items-center justify-center gap-2.5">
        {segments.map((segment, index) => (
          <React.Fragment key={segment.key}>
            {index > 0 ? (
              <span className="text-white/55" aria-hidden="true">
                /
              </span>
            ) : null}
            <span className={segment.className}>{segment.content}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
