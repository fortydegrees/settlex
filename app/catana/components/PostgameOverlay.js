import React from "react";

export function PostgameOverlay({ summary = [], onClose }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl bg-white/95 p-6 shadow-2xl ring-1 ring-white/70">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Postgame
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              Match Summary
            </div>
          </div>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex gap-2 text-sm font-semibold text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">
            Summary
          </span>
          <span className="rounded-full border border-dashed border-slate-300 px-3 py-1">
            Stats (coming soon)
          </span>
          <span className="rounded-full border border-dashed border-slate-300 px-3 py-1">
            Replay (coming soon)
          </span>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          {summary.length === 0 ? (
            <div className="text-sm text-slate-500">
              Postgame details will appear here.
            </div>
          ) : (
            summary.map((row) => (
              <div key={row.label} className="flex justify-between text-sm text-slate-700">
                <span className="font-medium">{row.label}</span>
                <span className="tabular-nums">{row.value}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
