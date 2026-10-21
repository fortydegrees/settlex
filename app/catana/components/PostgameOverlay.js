import React from "react";
import { Button } from "../../ui/Button";
import { getPlayerNameHex } from "../theme/playerColors.js";

const getSwatchColor = (color) => getPlayerNameHex(color) ?? color ?? "#888";

export function PostgameOverlay({
  summary = [],
  scoreboard = [],
  onWatchReplay,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-surface-game-scrim p-ui-4 backdrop-blur-sm">
      <div className="settlex-ui-pane max-h-full w-full max-w-4xl overflow-y-auto p-ui-5 sm:p-ui-6">
        <div className="flex flex-col gap-ui-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="settlex-ui-label">
              Postgame
            </div>
            <div className="mt-ui-2 type-title text-ink-primary">
              Match Summary
            </div>
          </div>
          <div className="flex gap-ui-2">
            <Button
              type="button"
              variant="primary" size="sm"
              onClick={onWatchReplay}
            >
              Watch replay
            </Button>
            <Button
              type="button"
              variant="secondary" size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>

        <div className="mt-ui-6">
          <div className="space-y-ui-3">
            {scoreboard.length > 0 ? (
              scoreboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between gap-ui-3 rounded-small p-ui-3 ${
                    index === 0
                      ? "settlex-ui-winner"
                      : "settlex-ui-inset"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-ui-3">
                    <span className="shrink-0 type-action text-ink-muted">
                      #{index + 1}
                    </span>
                    <div
                      className="h-8 w-8 shrink-0 rounded-pill"
                      style={{ backgroundColor: getSwatchColor(player.color) }}
                    />
                    <span className="min-w-0 break-words type-label text-ink-primary">
                      {player.name || `Player ${player.id}`}
                    </span>
                  </div>
                  <span className="shrink-0 type-section text-ink-secondary">
                    {player.vp} VP
                  </span>
                </div>
              ))
            ) : (
              <div className="type-body-small text-ink-muted">
                Final scores unavailable.
              </div>
            )}

            {summary.length > 0 ? (
              <div className="mt-ui-4 border-t border-edge-subtle pt-ui-4">
                {summary.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-ui-4 py-ui-1 type-body-small text-ink-secondary"
                  >
                    <span className="shrink-0 type-label">{row.label}</span>
                    <span className="min-w-0 break-words text-right tabular-nums">{row.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
