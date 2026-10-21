"use client";

import { BellAlertIcon } from "@heroicons/react/24/outline";
import { Button } from "../../ui/Button";
import { getMatchAlertStatusLabel } from "./matchAlertState";

export function MatchAlertControl({
  display,
  loading = false,
  error = "",
  surface = "modal",
  onAction = () => {},
}) {
  const isMenu = surface === "menu";
  const statusLabel = getMatchAlertStatusLabel(display?.status);

  return (
    <div
      className={
        isMenu
          ? "border-t border-edge-subtle px-ui-2.5 py-ui-2.5"
          : "settlex-ui-inset p-ui-3 text-left"
      }
    >
      <div className="flex flex-wrap items-center gap-ui-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-small bg-surface-inset text-ink-secondary">
          <BellAlertIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block type-action-small text-ink-primary">
            Match alerts
          </span>
          <span className="block type-caption text-ink-secondary">
            {statusLabel}
          </span>
        </span>
        {display?.action ? (
          <Button
            variant={isMenu ? "ghost" : "secondary"}
            size="sm"
            disabled={loading}
            onClick={() => void onAction(display.action)}
          >
            {display.actionLabel}
          </Button>
        ) : null}
      </div>
      {!isMenu || display?.status === "install_required" ? (
        <p className="mt-ui-2 type-caption text-ink-secondary">
          {display?.detail}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-ui-2 break-words type-caption text-ink-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
