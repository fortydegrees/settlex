import React from "react";
import { cn } from "./cn";

const VARIANT_STYLES = {
  neutral: {
    container: "ring-white/70",
    indicator: "bg-slate-400",
    title: "text-slate-800",
    body: "text-slate-600",
  },
  danger: {
    container: "ring-rose-200/90",
    indicator: "bg-rose-500 animate-pulse motion-reduce:animate-none",
    title: "text-rose-700",
    body: "text-rose-600",
  },
};

export function Banner({
  variant = "neutral",
  title,
  body = null,
  actions = null,
  className = "",
}) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.neutral;
  const hasBody = Boolean(body);

  return (
    <div
      className={cn(
        `flex items-center gap-3 rounded-2xl bg-white/80 px-4 ${
          hasBody ? "py-3" : "py-2.5"
        } text-slate-800 shadow-xl ring-1 backdrop-blur-md`,
        styles.container,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-3 w-3 shrink-0 rounded-full", styles.indicator)}
      />

      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-semibold", styles.title)}>{title}</div>
        {hasBody ? <div className={cn("text-sm", styles.body)}>{body}</div> : null}
      </div>

      {actions}
    </div>
  );
}
