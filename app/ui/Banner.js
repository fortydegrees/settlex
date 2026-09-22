import React from "react";
import { cn } from "./cn";

const VARIANT_STYLES = {
  neutral: {
    container:
      "border-blue-100 bg-blue-50",
    indicator:
      "bg-sky-600",
    title: "text-slate-900",
    body: "text-slate-700",
  },
  danger: {
    container:
      "border-rose-200 bg-rose-50",
    indicator:
      "bg-rose-600",
    title: "text-rose-700",
    body: "text-rose-800",
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
        `flex flex-col gap-3 rounded-[var(--settlex-ui-radius-control)] border px-4 ${
          hasBody ? "py-3" : "py-2.5"
        } text-slate-800 sm:flex-row sm:items-start`,
        styles.container,
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span
          aria-hidden="true"
          className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", styles.indicator)}
        />

        <div className="min-w-0 flex-1">
          <div className={cn("text-sm font-semibold tracking-[0.01em]", styles.title)}>
            {title}
          </div>
          {hasBody ? <div className={cn("mt-0.5 text-sm", styles.body)}>{body}</div> : null}
        </div>
      </div>

      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:[&>*]:w-auto [&>*]:w-full">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
