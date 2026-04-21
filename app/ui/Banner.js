import React from "react";
import { cn } from "./cn";

const VARIANT_STYLES = {
  neutral: {
    container:
      "border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(239,246,255,0.78))] ring-white/60",
    indicator:
      "bg-sky-200/95 shadow-[0_0_0_5px_rgba(191,219,254,0.55),0_0_0_10px_rgba(255,255,255,0.18)]",
    title: "text-slate-900",
    body: "text-slate-700",
  },
  danger: {
    container:
      "border-rose-200/85 bg-[linear-gradient(180deg,rgba(255,241,242,0.96),rgba(255,228,230,0.84))] ring-rose-200/85",
    indicator:
      "bg-rose-500 shadow-[0_0_0_5px_rgba(254,205,211,0.72),0_0_0_10px_rgba(255,255,255,0.16)] animate-pulse motion-reduce:animate-none",
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
        `flex items-start gap-4 rounded-[1.4rem] border px-4 ${
          hasBody ? "py-3" : "py-2.5"
        } text-slate-800 shadow-[0_18px_42px_-24px_rgba(15,23,42,0.48)] ring-1 backdrop-blur-xl`,
        styles.container,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-3 w-3 shrink-0 rounded-full", styles.indicator)}
      />

      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-semibold tracking-[0.01em]", styles.title)}>
          {title}
        </div>
        {hasBody ? <div className={cn("mt-0.5 text-sm", styles.body)}>{body}</div> : null}
      </div>

      {actions}
    </div>
  );
}
