"use client";

import { Popover } from "./Popover";
import { cn } from "./cn";

export function MetaDisclosure({
  label,
  ariaLabel,
  children,
  open,
  onOpenChange,
  className = "",
  triggerClassName = "",
  panelClassName = "",
  align = "end",
  sideOffset = 8,
}) {
  return (
    <div className={cn("inline-flex text-left", className)}>
      <Popover
        open={open}
        onOpenChange={onOpenChange}
        align={align}
        sideOffset={sideOffset}
        triggerAriaLabel={ariaLabel}
        triggerClassName={cn(
          "settlex-ui-focus min-h-[2.75rem] min-w-[2.75rem] text-center rounded-[var(--settlex-ui-radius-small)] px-1 text-xs font-medium leading-none text-slate-600 underline-offset-4 transition-colors duration-[var(--settlex-ui-duration-fast)] hover:text-slate-900 hover:underline motion-reduce:transition-none",
          triggerClassName
        )}
        triggerContent={<span>{label}</span>}
        className={cn(
          "w-[min(19rem,calc(100vw-1.5rem))] p-4 text-slate-800",
          panelClassName
        )}
      >
        {children}
      </Popover>
    </div>
  );
}
