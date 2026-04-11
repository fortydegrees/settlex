import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { getPlayerNameHex } from "../theme/playerColors.js";

const getSwatchColor = (color) => getPlayerNameHex(color) ?? color ?? "#888";

export function GameOverModal({
  title,
  subtitle,
  scoreboard = [],
  isWinner = false,
  shouldFireConfetti = false,
  onConfettiFired,
  onViewPostgame,
  onRematch,
  onLobby,
  onClose
}) {
  const winner = scoreboard.find((row) => row.isWinner) ?? scoreboard[0] ?? null;
  const secondaryRows =
    winner == null
      ? scoreboard.slice(1)
      : scoreboard.filter((row) => String(row.id) !== String(winner.id));

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
        onClick={onClose}
        className="absolute right-4 top-4 text-slate-500 hover:text-slate-700 text-2xl font-bold"
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

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <button
          className="rounded-lg bg-green-500 hover:bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02]"
          onClick={onViewPostgame}
        >
          View Postgame
        </button>
        <button
          className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-500 cursor-not-allowed"
          onClick={onRematch}
          disabled
        >
          Rematch
        </button>
        <button
          className="rounded-lg bg-slate-600 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          onClick={onLobby}
        >
          Return to Lobby
        </button>
        <button
          className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
