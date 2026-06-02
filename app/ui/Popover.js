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
          "outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-300/70",
          triggerClassName
        )}
      >
        {triggerContent}
      </BasePopover.Trigger>
      <BasePopover.Portal>
        <BasePopover.Positioner
          sideOffset={sideOffset}
          align={align}
          className="z-[60]"
        >
          <BasePopover.Popup
            className={cn(
              "w-max rounded-[1.35rem] border border-white/34 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(219,234,254,0.82))] p-3 shadow-[0_24px_52px_-32px_rgba(15,23,42,0.52)] backdrop-blur-xl transition-[opacity,transform] duration-[var(--settlex-ui-duration-fast)] data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.96] data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.96] motion-reduce:transition-none",
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
