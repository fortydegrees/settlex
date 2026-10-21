import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "../../ui/Button";
import { DisplayText } from "../../ui/DisplayText";
import { getPlayerNameHex } from "../theme/playerColors.js";
import {
  createGameOverModalActionHandlers,
  getMatchAlertResumeControlState,
} from "./gameOverAlertLifecycle.js";

const getSwatchColor = (color) => getPlayerNameHex(color) ?? color ?? "#888";

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
    <div className="settlex-ui-pane relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto p-ui-5 sm:p-ui-6">
      <button
        onClick={actions.close}
        disabled={matchAlertResume.pending}
        className="settlex-ui-button settlex-ui-button-ghost settlex-ui-focus absolute right-2 top-2 h-11 w-11 disabled:cursor-wait"
        aria-label="Close"
      >
        <span className="relative z-10">
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </span>
      </button>

      <div className="text-center">
        <div className="settlex-ui-celebration-glyph mb-ui-2">🏆</div>
        <div className="settlex-ui-label">
          Game Over
        </div>
        {isWinner ? (
          <DisplayText as="div" variant="celebration" className="mt-ui-2 break-words text-ink-primary">
            {title}
          </DisplayText>
        ) : (
          <div className="mt-ui-2 break-words type-title text-ink-primary">
            {title}
          </div>
        )}
        <div className="mt-ui-1 type-body-small text-ink-secondary">{subtitle}</div>
      </div>

      <div className="mt-ui-5 rounded-small settlex-ui-winner p-ui-4">
        {winner ? (
          <div className="flex items-center justify-between gap-ui-3">
            <div className="flex min-w-0 items-center gap-ui-3">
              <div
                className="h-10 w-10 shrink-0 rounded-pill"
                style={{ backgroundColor: getSwatchColor(winner.color) }}
              />
              <span className="min-w-0 break-words type-section text-ink-primary">
                {winner.name || `Player ${winner.id}`}
              </span>
            </div>
            <span className="shrink-0 type-section text-ink-highlight">
              {winner.vp} VP
            </span>
          </div>
        ) : (
          <div className="type-body-small text-ink-secondary">Final scores unavailable.</div>
        )}
      </div>

      {secondaryRows.length > 0 && (
        <div className="mt-ui-4 flex flex-wrap justify-center gap-ui-3">
          {secondaryRows.map((row) => (
            <div
              key={row.id}
              className="settlex-ui-inset flex min-w-0 max-w-full items-center gap-ui-2 px-ui-4 py-ui-3"
            >
              <div
                className="h-6 w-6 shrink-0 rounded-pill"
                style={{ backgroundColor: getSwatchColor(row.color) }}
              />
              <span className="min-w-0 break-words type-label text-ink-secondary">
                {row.name || `Player ${row.id}`}
              </span>
              <span className="shrink-0 type-action-small text-ink-secondary">
                {row.vp} VP
              </span>
            </div>
          ))}
        </div>
      )}

      {matchAlertResume.visible ? (
        <div className="settlex-ui-inset mt-ui-5 p-ui-3 text-left">
          <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-ui-3 type-label text-ink-secondary">
            <input
              type="checkbox"
              checked={matchAlertResume.checked}
              disabled={matchAlertResume.pending}
              onChange={(event) =>
                onMatchAlertResumeCheckedChange?.(event.target.checked)
              }
              className="settlex-ui-checkbox settlex-ui-focus h-4 w-4 shrink-0"
            />
            <span>{matchAlertResume.label}</span>
          </label>

          {matchAlertResume.error ? (
            <div className="mt-ui-3 settlex-ui-inline-error p-ui-3">
              <p className="type-label text-ink-danger" role="alert">
                {matchAlertResume.error}
              </p>
              <div className="mt-ui-3 flex flex-wrap gap-ui-2">
                <Button
                  type="button"
                  onClick={actions.retryMatchAlertResume}
                  disabled={matchAlertResume.pending}
                  variant="primary" size="sm"
                >
                  {matchAlertResume.pending ? "Retrying…" : "Retry"}
                </Button>
                <Button
                  type="button"
                  onClick={actions.continueWithoutMatchAlerts}
                  disabled={matchAlertResume.pending}
                  variant="secondary" size="sm"
                >
                  Continue without alerts
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-ui-6 grid gap-ui-2 sm:grid-cols-2">
        {onWatchReplay ? (
          <Button
            disabled={
              replayStatus === "loading" || matchAlertResume.pending
            }
            onClick={actions.watchReplay}
            size="sm"
          >
            {replayStatus === "error" ? "Retry replay" : replayStatus === "loading"
              ? "Preparing replay..."
              : "Replay"}
          </Button>
        ) : null}
        {onViewSummary ? (
          <Button
            variant="secondary" size="sm"
            onClick={actions.viewPostgame}
            disabled={matchAlertResume.pending}
          >
            Match summary
          </Button>
        ) : null}
        <Button
          variant="secondary" size="sm"
          onClick={actions.lobby}
          disabled={matchAlertResume.pending}
        >
          {matchAlertResume.pending ? "Returning…" : "Return to Lobby"}
        </Button>
        <Button
          variant="ghost" size="sm"
          onClick={actions.close}
          disabled={matchAlertResume.pending}
        >
          Close
        </Button>
      </div>
    </div>
  );
}
