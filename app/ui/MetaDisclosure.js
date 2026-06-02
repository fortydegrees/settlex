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
          "rounded-[0.35rem] px-1 py-0.5 text-[0.68rem] font-semibold leading-none text-white/60 underline-offset-4 decoration-white/0 transition-[color,text-decoration-color] duration-[var(--settlex-ui-duration-fast)] hover:text-white/90 hover:underline hover:decoration-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 motion-reduce:transition-none",
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
