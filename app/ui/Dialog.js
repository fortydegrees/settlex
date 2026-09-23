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
        <BaseDialog.Backdrop className="settlex-ui-dialog-backdrop settlex-ui-layer-dialog fixed inset-0 backdrop-blur-sm" />
        <BaseDialog.Viewport className="settlex-ui-dialog-viewport settlex-ui-layer-dialog fixed inset-0 flex items-center justify-center">
          <BaseDialog.Popup
            className={cn(
              "settlex-ui-pane settlex-ui-dialog-popup settlex-ui-dialog-surface w-full",
              maxWidthClassName,
              className
            )}
          >
            <BaseDialog.Title className="type-title text-ink-primary">
              {title}
            </BaseDialog.Title>

            {description ? (
              <BaseDialog.Description className="mt-ui-2 type-body-small text-ink-secondary">
                {description}
              </BaseDialog.Description>
            ) : null}

            {children ? (
              <div className={cn("mt-ui-5", bodyClassName)}>{children}</div>
            ) : null}

            {actions ? <div className="mt-ui-6 flex flex-wrap justify-end gap-ui-2">{actions}</div> : null}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
