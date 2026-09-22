"use client";

import React from "react";
import { cn } from "./cn";

function formatSwatchLabel(option) {
  const rawLabel = option.label ?? option.name ?? option.id;
  const label = String(rawLabel).replace(/[-_]+/g, " ");
  return `Choose ${label} player color`;
}

export function SwatchPicker({
  options,
  value,
  onChange,
  className = "",
  swatchClassName = "",
}) {
  return (
    <div
      className={cn(
        "mx-auto grid w-fit grid-cols-4 place-items-center gap-x-6 gap-y-5 py-3",
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            aria-label={formatSwatchLabel(option)}
            aria-pressed={isActive}
            onClick={() => onChange(option.id)}
            className={cn(
              "settlex-ui-focus h-11 w-11 cursor-pointer rounded-full transition-transform duration-[var(--settlex-ui-duration-fast)] motion-reduce:transition-none",
              option.swatch,
              isActive
                ? "ring-2 ring-slate-700 ring-offset-2 ring-offset-white"
                : "ring-1 ring-white/60 hover:ring-slate-500",
              swatchClassName
            )}
          />
        );
      })}
    </div>
  );
}
