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
        "overflow-hidden rounded-[1.6rem] border border-white/34 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(219,234,254,0.08))] shadow-[0_24px_54px_-34px_rgba(15,23,42,0.44)] backdrop-blur-xl",
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 border-b border-white/28 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/70 shadow-[0_0_0_4px_rgba(255,255,255,0.14)]" />
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
