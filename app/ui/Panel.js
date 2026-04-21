import React from "react";
import { cn } from "./cn";

export function Panel({
  title,
  right = null,
  className = "",
  bodyClassName = "",
  children,
}) {
  const hasHeader = Boolean(title || right);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(219,234,254,0.24)_52%,rgba(255,255,255,0.2))] shadow-[0_24px_60px_-28px_rgba(15,23,42,0.58)] ring-1 ring-white/35 backdrop-blur-xl",
        className
      )}
    >
      <div className="h-px w-full bg-white/70" />

      {hasHeader && (
        <div className="flex items-center justify-between gap-3 border-b border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.14))] px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-200/85 shadow-[0_0_0_4px_rgba(255,255,255,0.16)]" />
            <div className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
              {title}
            </div>
          </div>
          {right}
        </div>
      )}

      <div className={cn("p-5 md:p-6", bodyClassName)}>{children}</div>
    </div>
  );
}
