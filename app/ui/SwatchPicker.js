"use client";

import React from "react";
import { cn } from "./cn";

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
            aria-label={option.id}
            aria-pressed={isActive}
            onClick={() => onChange(option.id)}
            className={cn(
              "h-9 w-9 rounded-full transition-transform duration-[var(--settlex-ui-duration-fast)]",
              option.swatch,
              isActive
                ? "scale-[1.08] ring-2 ring-white ring-offset-2 ring-offset-sky-300/80"
                : "ring-1 ring-white/40 hover:scale-105",
              swatchClassName
            )}
          />
        );
      })}
    </div>
  );
}
