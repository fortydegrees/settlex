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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-blue-900/45 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-xl bg-blue-200/95 p-6 shadow-2xl ring-2 ring-slate-300">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-600">
              Postgame
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-800">
              Match Summary
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-lime-600"
              onClick={onWatchReplay}
            >
              Watch replay
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-[220px] rounded-lg bg-white/40 p-4">
          <div className="space-y-3">
            {scoreboard.length > 0 ? (
              scoreboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-lg p-3 ${
                    index === 0
                      ? "bg-yellow-100 ring-1 ring-yellow-300"
                      : "bg-white/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-slate-500">
                      #{index + 1}
                    </span>
                    <div
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: getSwatchColor(player.color) }}
                    />
                    <span className="font-medium text-slate-800">
                      {player.name || `Player ${player.id}`}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-slate-700">
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
              <div className="mt-4 rounded-lg bg-white/60 p-3">
                {summary.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between text-sm text-slate-700"
                  >
                    <span className="font-medium">{row.label}</span>
                    <span className="tabular-nums">{row.value}</span>
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
