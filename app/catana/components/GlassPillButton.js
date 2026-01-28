import React from "react";

export function GlassPillButton({ className = "", children, ...props }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-white/60 backdrop-blur-sm transition hover:bg-white/85 hover:scale-[1.02] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
