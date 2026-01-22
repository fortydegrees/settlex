import React from "react";

export function GameOverModal({
  title,
  subtitle,
  scoreboard = [],
  onViewPostgame,
  onRematch,
  onLobby,
  onClose
}) {
  return (
    <div className="w-full max-w-xl rounded-2xl bg-white/90 p-6 shadow-2xl ring-1 ring-white/60 backdrop-blur-md">
      <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
        Game Over
      </div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">
        {title}
      </div>
      <div className="mt-1 text-sm text-slate-600">{subtitle}</div>

      <div className="mt-4 rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200">
        {scoreboard.length === 0 ? (
          <div className="text-sm text-slate-500">Final scores unavailable.</div>
        ) : (
          scoreboard.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between text-sm text-slate-700"
            >
              <span className="font-medium">{row.name}</span>
              <span className="tabular-nums">{row.vp} VP</span>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={onViewPostgame}
        >
          View Postgame
        </button>
        <button
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 opacity-60"
          onClick={onRematch}
          disabled
        >
          Rematch
        </button>
        <button
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={onLobby}
        >
          Return to Lobby
        </button>
        <button
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
