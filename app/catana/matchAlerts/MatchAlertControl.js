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
          ? "border-t border-slate-200/72 px-2.5 py-2.5"
          : "settlex-ui-inset p-3 text-left"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-100/72 text-slate-700">
          <BellAlertIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">
            Match alerts
          </span>
          <span className="block text-xs font-medium text-slate-600">
            {statusLabel}
          </span>
        </span>
        {display?.action ? (
          <Button
            variant={isMenu ? "ghost" : "secondary"}
            size="sm"
            className="px-3 text-xs"
            disabled={loading}
            onClick={() => void onAction(display.action)}
          >
            {display.actionLabel}
          </Button>
        ) : null}
      </div>
      {!isMenu || display?.status === "install_required" ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          {display?.detail}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-2 break-words text-xs font-medium leading-relaxed text-rose-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
