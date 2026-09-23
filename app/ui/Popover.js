"use client";

import React from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { cn } from "./cn";

export function Popover({
  open,
  onOpenChange,
  triggerContent,
  triggerClassName = "",
  triggerAriaLabel,
  children,
  className = "",
  sideOffset = 10,
  align = "center",
}) {
  return (
    <BasePopover.Root open={open} onOpenChange={onOpenChange}>
      <BasePopover.Trigger
        aria-label={triggerAriaLabel}
        className={cn(
          "settlex-ui-focus",
          triggerClassName
        )}
      >
        {triggerContent}
      </BasePopover.Trigger>
      <BasePopover.Portal>
        <BasePopover.Positioner
          sideOffset={sideOffset}
          align={align}
          className="settlex-ui-layer-popover"
        >
          <BasePopover.Popup
            className={cn(
              "settlex-ui-pane settlex-ui-popover settlex-ui-overlay-motion w-max p-ui-3",
              className
            )}
          >
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
