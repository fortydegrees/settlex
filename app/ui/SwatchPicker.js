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
              "h-11 w-11 cursor-pointer rounded-full transition-transform duration-[var(--settlex-ui-duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sky-300/80 motion-reduce:transition-none",
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
