"use client";

import React from "react";
import { ToggleButton } from "./ToggleButton";
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
  disabled = false,
}) {
  return (
    <div
      className={cn(
        "mx-auto grid w-fit grid-cols-4 place-items-center gap-x-ui-6 gap-y-ui-5 py-ui-3",
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.id;

        return (
          <ToggleButton
            key={option.id}
            appearance="swatch"
            aria-label={formatSwatchLabel(option)}
            pressed={isActive}
            disabled={disabled || option.disabled || !onChange}
            onPressedChange={() => onChange?.(option.id)}
            className={cn(
              "h-11 w-11 rounded-pill",
              option.swatch,
              swatchClassName
            )}
          />
        );
      })}
    </div>
  );
}
