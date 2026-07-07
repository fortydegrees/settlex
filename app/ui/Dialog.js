"use client";

import React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cn } from "./cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  description = null,
  actions = null,
  children = null,
  className = "",
  bodyClassName = "",
  maxWidthClassName = "max-w-md",
}) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="settlex-ui-dialog-backdrop settlex-ui-layer-dialog fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_32%),rgba(15,23,42,0.42)] backdrop-blur-sm" />
        <BaseDialog.Viewport className="settlex-ui-layer-dialog fixed inset-0 flex items-center justify-center px-4">
          <BaseDialog.Popup
            className={cn(
              "settlex-ui-dialog-popup w-full rounded-[1.65rem] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.76))] p-6 shadow-[0_34px_90px_-44px_rgba(15,23,42,0.72)]",
              maxWidthClassName,
              className
            )}
          >
            <BaseDialog.Title className="text-2xl font-bold text-slate-900">
              {title}
            </BaseDialog.Title>

            {description ? (
              <BaseDialog.Description className="mt-3 text-sm text-slate-700">
                {description}
              </BaseDialog.Description>
            ) : null}

            {children ? (
              <div className={cn("mt-5", bodyClassName)}>{children}</div>
            ) : null}

            {actions ? <div className="mt-5 flex justify-end gap-2">{actions}</div> : null}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
