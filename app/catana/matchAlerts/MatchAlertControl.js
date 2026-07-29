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
          : "rounded-[1rem] border border-white/55 bg-white/42 p-3 text-left"
      }
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[0.74rem] bg-sky-100/72 text-slate-700">
          <BellAlertIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.78rem] font-bold text-slate-900">
            Match alerts
          </span>
          <span className="block text-[0.68rem] font-semibold text-slate-500">
            {statusLabel}
          </span>
        </span>
        {display?.action ? (
          <Button
            variant={isMenu ? "ghost" : "secondary"}
            size="sm"
            className={
              isMenu
                ? "min-h-8 px-2.5 py-1 text-xs"
                : "min-h-9 px-3 py-1.5 text-xs"
            }
            disabled={loading}
            onClick={() => void onAction(display.action)}
          >
            {display.actionLabel}
          </Button>
        ) : null}
      </div>
      {!isMenu || display?.status === "install_required" ? (
        <p className="mt-2 text-[0.7rem] font-medium leading-relaxed text-slate-600">
          {display?.detail}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-2 text-[0.7rem] font-semibold leading-relaxed text-rose-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
