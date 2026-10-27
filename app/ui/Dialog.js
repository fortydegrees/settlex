"use client";

import React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cn } from "./cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  titleClassName = "type-title text-ink-primary",
  dismissible = true,
  description = null,
  actions = null,
  children = null,
  className = "",
  bodyClassName = "",
  maxWidthClassName = "max-w-md",
}) {
  return (
    <BaseDialog.Root
      open={open}
      disablePointerDismissal={!dismissible}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen && !dismissible) {
          details.cancel();
          return;
        }
        onOpenChange?.(nextOpen, details);
      }}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="settlehex-ui-dialog-backdrop settlehex-ui-layer-dialog fixed inset-0 backdrop-blur-sm" />
        <BaseDialog.Viewport className="settlehex-ui-dialog-viewport settlehex-ui-layer-dialog fixed inset-0 flex items-center justify-center">
          <BaseDialog.Popup
            inert={!open}
            className={cn(
              "settlehex-ui-pane settlehex-ui-dialog-popup settlehex-ui-dialog-surface w-full",
              maxWidthClassName,
              className
            )}
          >
            <BaseDialog.Title className={titleClassName}>
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
