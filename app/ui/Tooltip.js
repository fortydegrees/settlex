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
              "rounded-[0.85rem] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(219,234,254,0.86))] px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.52)] backdrop-blur-xl transition-[opacity,transform] duration-[var(--settlex-ui-duration-fast)] data-[ending-style]:scale-[0.96] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.96] data-[starting-style]:opacity-0 motion-reduce:transition-none",
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
