import React from "react";

const formatTimer = (ms) => {
  if (ms == null) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export function IdlePromptModal({
  remainingMs,
  onAcknowledge,
  isSubmitting = false,
  error = null
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-blue-900/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-blue-200/95 p-6 shadow-2xl ring-2 ring-slate-300">
        <div className="text-xs font-semibold uppercase tracking-widest text-rose-700">
          Idle Warning
        </div>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Are you still there?
        </h2>
        <p className="mt-3 text-sm text-slate-700">
          You’ll forfeit in{" "}
          <span className="tabular-nums font-semibold text-rose-700">
            {formatTimer(remainingMs)}
          </span>{" "}
          unless you respond.
        </p>
        {error ? (
          <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>
        ) : null}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onAcknowledge}
            disabled={isSubmitting}
            className="rounded-lg bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-lime-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100"
            data-allow-interaction="true"
          >
            {isSubmitting ? "Sending…" : "I’m still here"}
          </button>
        </div>
      </div>
    </div>
  );
}
