import React, { useState } from "react";

const TABS = [
  { id: "summary", label: "Summary", enabled: true },
  { id: "stats", label: "Stats", enabled: false },
  { id: "replay", label: "Replay", enabled: false }
];

export function PostgameOverlay({ summary = [], scoreboard = [], onClose }) {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-blue-900/45 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-xl bg-blue-200/95 p-6 shadow-2xl ring-2 ring-slate-300">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-600">
              Postgame
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-800">
              Match Summary
            </div>
          </div>
          <button
            className="rounded-lg bg-slate-600 hover:bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex gap-1 bg-white/40 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => tab.enabled && setActiveTab(tab.id)}
              disabled={!tab.enabled}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white shadow text-slate-800"
                  : tab.enabled
                  ? "text-slate-600 hover:bg-white/50"
                  : "text-slate-400 cursor-not-allowed"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-white/40 p-4 min-h-[220px]">
          {activeTab === "summary" && (
            <div className="space-y-3">
              {scoreboard.length > 0 ? (
                scoreboard.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
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
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: player.color || "#888" }}
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

              {summary.length > 0 && (
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
              )}
            </div>
          )}

          {activeTab !== "summary" && (
            <div className="text-center text-slate-500 text-sm mt-8">
              More stats coming soon...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
