import React from "react";
import { cn } from "./cn";

const SIZE_STYLES = {
  sm: "min-h-[2.75rem] px-ui-4 py-ui-2 type-action-small",
  md: "min-h-[2.95rem] px-ui-5 py-ui-3 type-action-small",
  lg: "min-h-[3.2rem] px-ui-6 py-ui-3.5 type-action",
  xl: "min-h-[3.75rem] px-ui-7 py-ui-4 type-action-large",
};

const VARIANT_STYLES = {
  primary: "settlex-ui-button-primary",
  secondary: "settlex-ui-button-secondary",
  utility: "settlex-ui-button-secondary settlex-ui-button-utility",
  accent: "settlex-ui-button-accent",
  ghost: "settlex-ui-button-ghost",
  subtle: "settlex-ui-button-subtle",
  danger: "settlex-ui-button-danger",
};

const VARIANT_ALIASES = {
  pill: "utility",
  chip: "subtle",
};

export const Button = React.forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    sheen = false,
    className = "",
    type = "button",
    children,
    ...props
  },
  ref
) {
  const resolvedVariant = VARIANT_ALIASES[variant] ?? variant;

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "settlex-ui-button settlex-ui-focus",
        SIZE_STYLES[size] ?? SIZE_STYLES.md,
        VARIANT_STYLES[resolvedVariant] ?? VARIANT_STYLES.primary,
        className
      )}
      {...props}
    >
      {sheen ? (
        <span
          aria-hidden="true"
          className="settlex-ui-button-sheen pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 animate-[settlex-ui-cta-shimmer_3.4s_linear_infinite] motion-reduce:animate-none"
        />
      ) : null}
      <span className="relative z-10 inline-flex w-full min-w-0 items-center [justify-content:inherit] gap-ui-2">{children}</span>
    </button>
  );
});
