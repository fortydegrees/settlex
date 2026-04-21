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
        "w-full rounded-lg bg-white/60 px-3 py-2 text-sm text-slate-800 shadow-inner ring-1 ring-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70 focus-visible:ring-2 focus-visible:ring-white/70",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
