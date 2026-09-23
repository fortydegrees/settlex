"use client";

import React from "react";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";

// State and match configuration stay in GameScreen; these are the same
// production compositions used by the isolated Storybook fixtures.
export function GameSettingsDialog({
  open,
  onOpenChange,
  isMuted,
  onToggleMute,
  themeId,
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Game settings"
      description="Local controls for this match."
      maxWidthClassName="max-w-sm"
      actions={
        <Button variant="secondary" onClick={() => onOpenChange(false)} data-allow-interaction="true">
          Close
        </Button>
      }
    >
      <div className="space-y-ui-3">
        <div className="settlex-ui-inset px-ui-4 py-ui-3">
          <div className="flex items-center justify-between gap-ui-4">
            <span className="type-action-small text-ink-primary">Audio</span>
            <span className="type-label text-ink-secondary">{isMuted ? "Muted" : "On"}</span>
          </div>
          <Button
            variant={isMuted ? "primary" : "secondary"}
            size="sm"
            className="mt-ui-3 w-full"
            onClick={onToggleMute}
            data-allow-interaction="true"
          >
            {isMuted ? "Unmute audio" : "Mute audio"}
          </Button>
        </div>
        <div className="settlex-ui-inset flex items-center justify-between gap-ui-4 px-ui-4 py-ui-3">
          <span className="type-action-small text-ink-primary">Theme</span>
          <span className="min-w-0 break-words text-right type-label capitalize text-ink-secondary">{themeId}</span>
        </div>
      </div>
    </Dialog>
  );
}

export function GameRulesDialog({ open, onOpenChange, rows }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Game rules"
      description="Current match configuration."
      maxWidthClassName="max-w-md"
      actions={
        <Button variant="secondary" onClick={() => onOpenChange(false)} data-allow-interaction="true">
          Close
        </Button>
      }
    >
      <dl className="grid gap-ui-2">
        {rows.map(([label, value]) => (
          <div key={label} className="settlex-ui-inset grid grid-cols-2 items-center gap-ui-4 px-ui-4 py-ui-3">
            <dt className="min-w-0 break-words type-action-small text-ink-primary">{label}</dt>
            <dd className="min-w-0 break-words text-right type-label text-ink-secondary">{value}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
