import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { getPlayerNameHex } from "../theme/playerColors.js";
import {
  createGameOverModalActionHandlers,
  getMatchAlertResumeControlState,
} from "./gameOverAlertLifecycle.js";

const getSwatchColor = (color) => getPlayerNameHex(color) ?? color ?? "#888";
const replayReadyClassName =
  "settlex-ui-button settlex-ui-button-primary settlex-ui-focus min-h-[2.75rem] px-4 py-2 text-sm";
const replayDisabledClassName =
  replayReadyClassName;

export function GameOverModal({
  title,
  subtitle,
  scoreboard = [],
  isWinner = false,
  shouldFireConfetti = false,
  onConfettiFired,
  onWatchReplay,
  replayStatus = "ready",
  onViewSummary,
  onLobby,
  onClose,
  showMatchAlertResume = false,
  matchAlertResumeChecked = true,
  matchAlertResumeError = "",
  matchAlertResumePending = false,
  onMatchAlertResumeCheckedChange,
  onRetryMatchAlertResume,
  onContinueWithoutMatchAlerts,
}) {
  const winner = scoreboard.find((row) => row.isWinner) ?? scoreboard[0] ?? null;
  const secondaryRows =
    winner == null
      ? scoreboard.slice(1)
      : scoreboard.filter((row) => String(row.id) !== String(winner.id));
  const matchAlertResume = getMatchAlertResumeControlState({
    showMatchAlertResume,
    matchAlertResumeChecked,
    matchAlertResumeError,
    matchAlertResumePending,
  });
  const actions = createGameOverModalActionHandlers({
    onClose,
    onWatchReplay,
    onViewPostgame: onViewSummary,
    onLobby,
    onRetryMatchAlertResume,
    onContinueWithoutMatchAlerts,
    pending: matchAlertResume.pending,
  });

  useEffect(() => {
    if (!isWinner || !shouldFireConfetti) return;
    confetti({
      particleCount: 140,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#fbbf24", "#f59e0b", "#d97706", "#ffffff", "#fef3c7"],
    });
    onConfettiFired?.();
  }, [isWinner, shouldFireConfetti, onConfettiFired]);

  return (
    <div className="settlex-ui-pane relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto p-5 sm:p-6">
      <button
        onClick={actions.close}
        disabled={matchAlertResume.pending}
        className="settlex-ui-button settlex-ui-button-ghost settlex-ui-focus absolute right-2 top-2 h-11 w-11 text-2xl disabled:cursor-wait"
        aria-label="Close"
      >
        ×
      </button>

      <div className="text-center">
        <div className="text-4xl mb-2">🏆</div>
        <div className="settlex-ui-label">
          Game Over
        </div>
        <div className="mt-2 break-words text-2xl font-semibold text-slate-900">
          {title}
        </div>
        <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
      </div>

      <div className="mt-5 rounded-[var(--settlex-ui-radius-small)] bg-amber-100 p-4 ring-1 ring-amber-300">
        {winner ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="h-10 w-10 shrink-0 rounded-full"
                style={{ backgroundColor: getSwatchColor(winner.color) }}
              />
              <span className="min-w-0 break-words text-lg font-semibold text-slate-800">
                {winner.name || `Player ${winner.id}`}
              </span>
            </div>
            <span className="shrink-0 text-xl font-semibold text-amber-800">
              {winner.vp} VP
            </span>
          </div>
        ) : (
          <div className="text-sm text-slate-600">Final scores unavailable.</div>
        )}
      </div>

      {secondaryRows.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {secondaryRows.map((row) => (
            <div
              key={row.id}
              className="settlex-ui-inset flex min-w-0 max-w-full items-center gap-2 px-4 py-3"
            >
              <div
                className="h-6 w-6 shrink-0 rounded-full"
                style={{ backgroundColor: getSwatchColor(row.color) }}
              />
              <span className="min-w-0 break-words font-medium text-slate-700">
                {row.name || `Player ${row.id}`}
              </span>
              <span className="shrink-0 text-slate-600 font-semibold">
                {row.vp} VP
              </span>
            </div>
          ))}
        </div>
      )}

      {matchAlertResume.visible ? (
        <div className="settlex-ui-inset mt-5 p-3 text-left">
          <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={matchAlertResume.checked}
              disabled={matchAlertResume.pending}
              onChange={(event) =>
                onMatchAlertResumeCheckedChange?.(event.target.checked)
              }
              className="settlex-ui-focus h-4 w-4 shrink-0 rounded border-slate-300 text-lime-600"
            />
            <span>{matchAlertResume.label}</span>
          </label>

          {matchAlertResume.error ? (
            <div className="mt-3 rounded-lg bg-rose-50 p-3 ring-1 ring-rose-200">
              <p className="text-sm font-medium text-rose-700" role="alert">
                {matchAlertResume.error}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={actions.retryMatchAlertResume}
                  disabled={matchAlertResume.pending}
                  className="settlex-ui-button settlex-ui-button-primary settlex-ui-focus min-h-[2.75rem] px-4 py-2 text-sm"
                >
                  {matchAlertResume.pending ? "Retrying…" : "Retry"}
                </button>
                <button
                  type="button"
                  onClick={actions.continueWithoutMatchAlerts}
                  disabled={matchAlertResume.pending}
                  className="settlex-ui-button settlex-ui-button-secondary settlex-ui-focus min-h-[2.75rem] whitespace-normal px-4 py-2 text-sm"
                >
                  Continue without alerts
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {onWatchReplay ? (
          <button
            disabled={
              replayStatus === "loading" || matchAlertResume.pending
            }
            onClick={actions.watchReplay}
            className={
              replayStatus === "loading"
                ? replayDisabledClassName
                : replayReadyClassName
            }
          >
            {replayStatus === "error" ? "Retry replay" : replayStatus === "loading"
              ? "Preparing replay..."
              : "Replay"}
          </button>
        ) : null}
        {onViewSummary ? (
          <button
            className="settlex-ui-button settlex-ui-button-secondary settlex-ui-focus min-h-[2.75rem] px-4 py-2 text-sm"
            onClick={actions.viewPostgame}
            disabled={matchAlertResume.pending}
          >
            Match summary
          </button>
        ) : null}
        <button
          className="settlex-ui-button settlex-ui-button-secondary settlex-ui-focus min-h-[2.75rem] px-4 py-2 text-sm"
          onClick={actions.lobby}
          disabled={matchAlertResume.pending}
        >
          {matchAlertResume.pending ? "Returning…" : "Return to Lobby"}
        </button>
        <button
          className="settlex-ui-button settlex-ui-button-ghost settlex-ui-focus min-h-[2.75rem] px-4 py-2 text-sm"
          onClick={actions.close}
          disabled={matchAlertResume.pending}
        >
          Close
        </button>
      </div>
    </div>
  );
}
