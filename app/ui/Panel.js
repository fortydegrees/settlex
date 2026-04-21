import React from "react";
import { cn } from "./cn";

export function Panel({
  title,
  right = null,
  className = "",
  bodyClassName = "",
  children,
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm",
        className
      )}
    >
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b border-white/40 bg-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700">
          <div>{title}</div>
          {right}
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </div>
  );
}
