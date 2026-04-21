import React from "react";
import { cn } from "./cn";

export const Input = React.forwardRef(function Input(
  { className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-2xl border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(219,234,254,0.72))] px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-500 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.8),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-md transition-[transform,box-shadow,border-color] duration-[var(--settlex-ui-duration-fast)] focus:outline-none focus:ring-2 focus:ring-sky-100 focus-visible:ring-2 focus-visible:ring-sky-100 focus:border-white/90",
        className
      )}
      {...props}
    />
  );
});
