"use client";

import React from "react";
import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "./Button";
import { cn } from "./cn";

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description = null,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  className = "",
  confirmVariant = "danger",
}) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange?.(false);
  };

  return (
    <BaseAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseAlertDialog.Portal>
        <BaseAlertDialog.Backdrop className="settlex-ui-dialog-backdrop fixed inset-0 z-40 bg-blue-900/40 backdrop-blur-sm" />
        <BaseAlertDialog.Viewport className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <BaseAlertDialog.Popup
            className={cn(
              "settlex-ui-dialog-popup w-full max-w-md rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(191,219,254,0.96),rgba(219,234,254,0.94)_18%,rgba(255,255,255,0.94))] p-6 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.72)] ring-1 ring-white/45 backdrop-blur-xl",
              className
            )}
          >
            <BaseAlertDialog.Title className="text-2xl font-bold text-slate-900">
              {title}
            </BaseAlertDialog.Title>

            {description ? (
              <BaseAlertDialog.Description className="mt-3 text-sm text-slate-700">
                {description}
              </BaseAlertDialog.Description>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={handleCancel}>
                {cancelLabel}
              </Button>
              <Button variant={confirmVariant} onClick={handleConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </BaseAlertDialog.Popup>
        </BaseAlertDialog.Viewport>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  );
}
