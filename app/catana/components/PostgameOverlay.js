import React from "react";
import { getPlayerNameHex } from "../theme/playerColors.js";

const getSwatchColor = (color) => getPlayerNameHex(color) ?? color ?? "#888";

export function PostgameOverlay({
  summary = [],
  scoreboard = [],
  onWatchReplay,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-blue-900/45 p-4 backdrop-blur-sm">
      <div className="settlex-ui-pane max-h-full w-full max-w-4xl overflow-y-auto p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="settlex-ui-label">
              Postgame
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-800">
              Match Summary
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="settlex-ui-button settlex-ui-button-primary settlex-ui-focus min-h-[2.75rem] px-4 py-2 text-sm"
              onClick={onWatchReplay}
            >
              Watch replay
            </button>
            <button
              type="button"
              className="settlex-ui-button settlex-ui-button-secondary settlex-ui-focus min-h-[2.75rem] px-4 py-2 text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="space-y-3">
            {scoreboard.length > 0 ? (
              scoreboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between gap-3 rounded-[var(--settlex-ui-radius-small)] p-3 ${
                    index === 0
                      ? "bg-yellow-100 ring-1 ring-yellow-300"
                      : "settlex-ui-inset"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 text-base font-semibold text-slate-500">
                      #{index + 1}
                    </span>
                    <div
                      className="h-8 w-8 shrink-0 rounded-full"
                      style={{ backgroundColor: getSwatchColor(player.color) }}
                    />
                    <span className="min-w-0 break-words font-medium text-slate-800">
                      {player.name || `Player ${player.id}`}
                    </span>
                  </div>
                  <span className="shrink-0 text-lg font-semibold text-slate-700">
                    {player.vp} VP
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">
                Final scores unavailable.
              </div>
            )}

            {summary.length > 0 ? (
              <div className="mt-4 border-t border-blue-100 pt-4">
                {summary.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-4 py-1 text-sm text-slate-700"
                  >
                    <span className="shrink-0 font-medium">{row.label}</span>
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
