"use client";

import React from "react";
import { Button } from "./Button";
import { cn } from "./cn";

const SIZE_STYLES = {
  sm: "h-10 w-10",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

export const IconButton = React.forwardRef(function IconButton(
  {
    variant = "secondary",
    size = "md",
    className = "",
    children,
    "aria-label": ariaLabel,
    ...props
  },
  ref
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      aria-label={ariaLabel}
      className={cn(
        "rounded-full p-0 text-lg leading-none",
        SIZE_STYLES[size] ?? SIZE_STYLES.md,
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
});
