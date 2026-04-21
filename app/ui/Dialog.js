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
        <BaseDialog.Backdrop className="settlex-ui-dialog-backdrop fixed inset-0 z-40 bg-blue-900/40 backdrop-blur-sm" />
        <BaseDialog.Viewport className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <BaseDialog.Popup
            className={cn(
              "settlex-ui-dialog-popup w-full rounded-xl bg-blue-200/95 p-6 shadow-2xl ring-2 ring-slate-300",
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
