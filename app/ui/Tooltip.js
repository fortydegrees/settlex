"use client";

import React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cn } from "./cn";

export function TooltipProvider({ children, delay = 450, closeDelay = 0 }) {
  return (
    <BaseTooltip.Provider delay={delay} closeDelay={closeDelay}>
      {children}
    </BaseTooltip.Provider>
  );
}

export function Tooltip({
  label,
  children,
  className = "",
  side = "top",
  sideOffset = 10,
  align = "center",
  triggerAriaLabel,
}) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger aria-label={triggerAriaLabel} render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          side={side}
          sideOffset={sideOffset}
          align={align}
          className="settlex-ui-layer-tooltip"
        >
          <BaseTooltip.Popup
            className={cn(
              "settlex-ui-pane settlex-ui-tooltip settlex-ui-overlay-motion px-ui-3 py-ui-2 type-caption text-ink-secondary",
              className
            )}
          >
            {label}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
