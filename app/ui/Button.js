import React from "react";
import { cn } from "./cn";

const SIZE_STYLES = {
  sm: "min-h-[2.35rem] px-4 py-2 text-sm",
  md: "min-h-[2.95rem] px-5 py-3 text-sm",
  lg: "min-h-[3.2rem] px-6 py-3.5 text-base",
  xl: "min-h-[3.75rem] px-7 py-4 text-lg",
};

const VARIANT_STYLES = {
  primary:
    "rounded-[1.2rem] border border-lime-200/65 bg-[linear-gradient(180deg,rgba(132,204,22,1),rgba(101,163,13,0.96))] font-semibold text-white shadow-[0_16px_36px_-22px_rgba(77,124,15,0.82)] hover:-translate-y-0.5 hover:brightness-[1.03] active:translate-y-0",
  secondary:
    "rounded-[1.2rem] border border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.72))] font-semibold text-slate-900 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.34)] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(239,246,255,0.82))] active:translate-y-0",
  accent:
    "rounded-[1.2rem] border border-amber-200/75 bg-[linear-gradient(180deg,rgba(251,191,36,1),rgba(245,158,11,0.96))] font-semibold text-slate-900 shadow-[0_16px_36px_-22px_rgba(180,83,9,0.56)] hover:-translate-y-0.5 hover:brightness-[1.03] active:translate-y-0",
  ghost:
    "rounded-[1.2rem] border border-transparent bg-white/0 font-semibold text-slate-700 hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/16 hover:text-slate-900 active:translate-y-0",
  subtle:
    "rounded-[1rem] border border-white/35 bg-white/14 font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:-translate-y-0.5 hover:bg-white/20 active:translate-y-0",
  danger:
    "rounded-[1.2rem] border border-rose-200/70 bg-[linear-gradient(180deg,rgba(244,63,94,1),rgba(225,29,72,0.96))] font-semibold text-white shadow-[0_16px_36px_-22px_rgba(190,24,93,0.78)] hover:-translate-y-0.5 hover:brightness-[1.03] active:translate-y-0",
};

const VARIANT_ALIASES = {
  pill: "secondary",
  chip: "subtle",
};

const DISABLED_STYLES =
  "disabled:cursor-not-allowed disabled:border-slate-200/80 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:brightness-100 disabled:hover:bg-none disabled:hover:bg-slate-200";

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
        "relative isolate inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap tracking-[0.02em] transition-[transform,box-shadow,background-color,border-color,color,filter] duration-[var(--settlex-ui-duration-fast)] motion-reduce:transition-none",
        SIZE_STYLES[size] ?? SIZE_STYLES.md,
        VARIANT_STYLES[resolvedVariant] ?? VARIANT_STYLES.primary,
        DISABLED_STYLES,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85",
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
      <span className="relative z-10">{children}</span>
    </button>
  );
});
