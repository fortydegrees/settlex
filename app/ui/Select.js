import React from "react";
import { cn } from "./cn";

export const Select = React.forwardRef(function Select(
  { className = "", children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full appearance-none rounded-[1.1rem] border border-white/36 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,246,255,0.64))] px-4 py-3 text-[15px] text-slate-900 shadow-[0_14px_26px_-22px_rgba(15,23,42,0.5)] transition-[transform,box-shadow,border-color] duration-[var(--settlex-ui-duration-fast)] focus:outline-none focus:ring-2 focus:ring-sky-100 focus-visible:ring-2 focus-visible:ring-sky-100",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
