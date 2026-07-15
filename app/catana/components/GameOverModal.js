import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { getPlayerNameHex } from "../theme/playerColors.js";
import {
  createGameOverModalActionHandlers,
  getMatchAlertResumeControlState,
} from "./gameOverAlertLifecycle.js";

const getSwatchColor = (color) => getPlayerNameHex(color) ?? color ?? "#888";
const replayReadyClassName =
  "rounded-lg bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-lime-600";
const replayDisabledClassName =
  "cursor-not-allowed rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm";

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
    <div className="relative w-full max-w-xl rounded-xl bg-blue-200/95 p-8 shadow-2xl ring-2 ring-slate-300 backdrop-blur-sm">
      <button
        onClick={actions.close}
        disabled={matchAlertResume.pending}
        className="absolute right-4 top-4 text-slate-500 hover:text-slate-700 text-2xl font-bold disabled:cursor-wait disabled:text-slate-400"
        aria-label="Close"
      >
        ×
      </button>

      <div className="text-center">
        <div className="text-4xl mb-2">🏆</div>
        <div className="text-xs uppercase tracking-[0.3em] text-slate-600">
          Game Over
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-800 drop-shadow-sm">
          {title}
        </div>
        <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
      </div>

      <div className="mt-5 rounded-lg bg-gradient-to-br from-yellow-100 to-yellow-200 p-4 shadow-md ring-2 ring-yellow-400">
        {winner ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full shadow-inner"
                style={{ backgroundColor: getSwatchColor(winner.color) }}
              />
              <span className="text-xl font-bold text-slate-800">
                {winner.name || `Player ${winner.id}`}
              </span>
            </div>
            <span className="text-2xl font-bold text-yellow-700">
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
              className="bg-white/60 rounded-lg px-4 py-2 shadow-sm flex items-center gap-2"
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: getSwatchColor(row.color) }}
              />
              <span className="font-medium text-slate-700">
                {row.name || `Player ${row.id}`}
              </span>
              <span className="text-slate-500 font-semibold">
                {row.vp} VP
              </span>
            </div>
          ))}
        </div>
      )}

      {matchAlertResume.visible ? (
        <div className="mt-5 rounded-lg bg-white/60 p-3 text-left shadow-sm ring-1 ring-white/70">
          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={matchAlertResume.checked}
              disabled={matchAlertResume.pending}
              onChange={(event) =>
                onMatchAlertResumeCheckedChange?.(event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-lime-600 focus:ring-lime-500"
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
                  className="rounded-lg bg-lime-500 px-3 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-lime-600 disabled:cursor-wait disabled:bg-slate-300"
                >
                  {matchAlertResume.pending ? "Retrying…" : "Retry"}
                </button>
                <button
                  type="button"
                  onClick={actions.continueWithoutMatchAlerts}
                  disabled={matchAlertResume.pending}
                  className="rounded-lg bg-slate-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 disabled:cursor-wait disabled:bg-slate-300"
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
            className="rounded-lg bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white/85 disabled:cursor-wait disabled:text-slate-400"
            onClick={actions.viewPostgame}
            disabled={matchAlertResume.pending}
          >
            Match summary
          </button>
        ) : null}
        <button
          className="rounded-lg bg-slate-600 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-wait disabled:bg-slate-300"
          onClick={actions.lobby}
          disabled={matchAlertResume.pending}
        >
          {matchAlertResume.pending ? "Returning…" : "Return to Lobby"}
        </button>
        <button
          className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:cursor-wait disabled:text-slate-400"
          onClick={actions.close}
          disabled={matchAlertResume.pending}
        >
          Close
        </button>
      </div>
    </div>
  );
}
