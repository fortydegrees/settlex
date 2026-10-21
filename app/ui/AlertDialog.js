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
        <BaseAlertDialog.Backdrop className="settlex-ui-dialog-backdrop settlex-ui-layer-dialog fixed inset-0 backdrop-blur-sm" />
        <BaseAlertDialog.Viewport className="settlex-ui-dialog-viewport settlex-ui-layer-dialog fixed inset-0 flex items-center justify-center">
          <BaseAlertDialog.Popup
            className={cn(
              "settlex-ui-pane settlex-ui-dialog-popup settlex-ui-dialog-surface w-full max-w-md",
              className
            )}
          >
            <BaseAlertDialog.Title className="type-title text-ink-primary">
              {title}
            </BaseAlertDialog.Title>

            {description ? (
              <BaseAlertDialog.Description className="mt-ui-2 type-body-small text-ink-secondary">
                {description}
              </BaseAlertDialog.Description>
            ) : null}

            <div className="mt-ui-6 flex flex-wrap justify-end gap-ui-2">
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
