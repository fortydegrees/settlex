import React from "react";
import { cn } from "./cn";

const SIZE_STYLES = {
  sm: "min-h-[2.35rem] px-3.5 py-2 text-sm",
  md: "min-h-[2.85rem] px-4.5 py-2.5 text-sm",
  lg: "min-h-[3.2rem] px-5 py-3 text-base",
};

const VARIANT_STYLES = {
  primary:
    "rounded-2xl border border-lime-200/80 bg-[linear-gradient(180deg,rgba(163,230,53,0.98),rgba(132,204,22,0.96)_48%,rgba(101,163,13,0.98))] font-bold text-white shadow-[0_14px_30px_-16px_rgba(77,124,15,0.95),inset_0_1px_0_rgba(255,255,255,0.38)] hover:-translate-y-0.5 hover:brightness-[1.03] hover:shadow-[0_18px_34px_-18px_rgba(77,124,15,0.92),inset_0_1px_0_rgba(255,255,255,0.46)] active:translate-y-0",
  pill:
    "rounded-2xl border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,246,255,0.78))] font-semibold text-slate-700 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.88))] hover:text-slate-800 active:translate-y-0",
  ghost:
    "rounded-2xl border border-transparent bg-white/0 font-semibold text-slate-600 hover:-translate-y-0.5 hover:border-white/45 hover:bg-white/40 hover:text-slate-800 active:translate-y-0",
  chip:
    "rounded-2xl border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(219,234,254,0.34))] font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(219,234,254,0.44))] active:translate-y-0",
  danger:
    "rounded-2xl border border-rose-200/80 bg-[linear-gradient(180deg,rgba(251,113,133,0.98),rgba(244,63,94,0.96)_48%,rgba(225,29,72,0.98))] font-bold text-white shadow-[0_14px_30px_-16px_rgba(190,24,93,0.88),inset_0_1px_0_rgba(255,255,255,0.32)] hover:-translate-y-0.5 hover:brightness-[1.03] hover:shadow-[0_18px_34px_-18px_rgba(190,24,93,0.82),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-0",
};

const DISABLED_STYLES =
  "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-sm disabled:hover:translate-y-0 disabled:hover:brightness-100 disabled:hover:bg-slate-300";

export const Button = React.forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    className = "",
    type = "button",
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap tracking-[0.02em] transition-[transform,box-shadow,background-color,border-color,color,filter] duration-[var(--settlex-ui-duration-fast)] motion-reduce:transition-none",
        SIZE_STYLES[size] ?? SIZE_STYLES.md,
        VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary,
        DISABLED_STYLES,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85",
        className
      )}
      {...props}
    />
  );
});
