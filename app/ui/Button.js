import React from "react";
import { cn } from "./cn";

const SIZE_STYLES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
};

const VARIANT_STYLES = {
  primary:
    "rounded-lg bg-lime-500 font-bold text-white shadow-md transition-all hover:bg-lime-600 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100",
  pill:
    "rounded-full bg-white/70 font-semibold text-slate-700 shadow-lg ring-1 ring-white/60 backdrop-blur-sm transition hover:bg-white/85 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100",
  ghost:
    "rounded-full font-semibold text-slate-600 transition hover:bg-white/60 hover:text-slate-800 motion-reduce:transition-none",
  chip:
    "rounded-full bg-white/40 font-semibold text-slate-700 ring-1 ring-white/50 transition-all hover:bg-white/60 motion-reduce:transition-none",
  danger:
    "rounded-lg bg-rose-500 font-bold text-white shadow-md transition-all hover:bg-rose-600 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100",
};

const DISABLED_STYLES =
  "disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-sm disabled:hover:scale-100 disabled:hover:bg-slate-300";

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
        SIZE_STYLES[size] ?? SIZE_STYLES.md,
        VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary,
        DISABLED_STYLES,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
        className
      )}
      {...props}
    />
  );
});
