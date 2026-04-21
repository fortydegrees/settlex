import React from "react";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";

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
    <Dialog
      open
      title="Are you still there?"
      actions={
        <Button
          variant="primary"
          type="button"
          data-allow-interaction="true"
          onClick={onAcknowledge}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending…" : "I’m still here"}
        </Button>
      }
    >
      <div className="text-xs font-semibold uppercase tracking-widest text-rose-700">
        Idle Warning
      </div>
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
    </Dialog>
  );
}
