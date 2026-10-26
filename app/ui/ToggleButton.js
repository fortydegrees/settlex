"use client";

import React from "react";
import { cn } from "./cn";

// Native activation/focus/disabled behavior; callers own the persistent value.
// Use Switch for labelled settings and Tabs for panels.
export const ToggleButton = React.forwardRef(function ToggleButton(
  { pressed = false, onPressedChange, disabled = false, appearance = "inset", className, children, ...props }, ref
) {
  return (
    <button {...props} ref={ref} type="button" aria-pressed={pressed}
      disabled={disabled || !onPressedChange}
      onClick={() => onPressedChange?.(!pressed)}
      className={cn("settlehex-ui-choice settlehex-ui-focus type-action-small", appearance === "swatch" ? "settlehex-ui-swatch" : "settlehex-ui-toggle", className)}>
      {children}
    </button>
  );
});
