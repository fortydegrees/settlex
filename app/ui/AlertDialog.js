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
        <BaseAlertDialog.Backdrop className="settlex-ui-dialog-backdrop settlex-ui-layer-dialog fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_32%),rgba(15,23,42,0.42)] backdrop-blur-sm" />
        <BaseAlertDialog.Viewport className="settlex-ui-layer-dialog fixed inset-0 flex items-center justify-center px-4">
          <BaseAlertDialog.Popup
            className={cn(
              "settlex-ui-dialog-popup w-full max-w-md rounded-[1.65rem] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.76))] p-6 shadow-[0_34px_90px_-44px_rgba(15,23,42,0.72)]",
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
