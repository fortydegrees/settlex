import React from "react";
import { cn } from "./cn";

const VARIANT_STYLES = {
  neutral: {
    container:
      "settlehex-ui-banner-neutral",
    indicator:
      "settlehex-ui-banner-marker",
    title: "settlehex-ui-banner-title",
    body: "settlehex-ui-banner-body",
  },
  danger: {
    container:
      "settlehex-ui-banner-danger",
    indicator:
      "settlehex-ui-banner-marker",
    title: "settlehex-ui-banner-title",
    body: "settlehex-ui-banner-body",
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
        `flex flex-col gap-ui-3 rounded-control border px-ui-4 ${
          hasBody ? "py-ui-3" : "py-ui-2.5"
        } text-ink-primary sm:flex-row sm:items-start`,
        styles.container,
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-ui-4">
        <span
          aria-hidden="true"
          className={cn("mt-ui-1.5 h-2 w-2 shrink-0 rounded-pill", styles.indicator)}
        />

        <div className="min-w-0 flex-1">
          <div className={cn("type-action-small", styles.title)}>
            {title}
          </div>
          {hasBody ? <div className={cn("mt-ui-0.5 type-body-small", styles.body)}>{body}</div> : null}
        </div>
      </div>

      {actions ? (
        <div className="flex w-full flex-col gap-ui-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:[&>*]:w-auto [&>*]:w-full">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
