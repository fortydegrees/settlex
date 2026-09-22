import React from "react";
import { cn } from "./cn";

const SIZE_STYLES = {
  sm: "min-h-[2.75rem] px-4 py-2 text-sm",
  md: "min-h-[2.95rem] px-5 py-3 text-sm",
  lg: "min-h-[3.2rem] px-6 py-3.5 text-base",
  xl: "min-h-[3.75rem] px-7 py-4 text-lg",
};

const VARIANT_STYLES = {
  primary: "settlex-ui-button-primary",
  secondary: "settlex-ui-button-secondary",
  accent: "settlex-ui-button-accent",
  ghost: "settlex-ui-button-ghost",
  subtle: "settlex-ui-button-subtle",
  danger: "settlex-ui-button-danger",
};

const VARIANT_ALIASES = {
  pill: "secondary",
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
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.24)_45%,transparent_70%)] opacity-0 animate-[settlex-ui-cta-shimmer_3.4s_linear_infinite] motion-reduce:animate-none"
        />
      ) : null}
      <span className="relative z-10 inline-flex w-full min-w-0 items-center [justify-content:inherit] gap-2">{children}</span>
    </button>
  );
});
