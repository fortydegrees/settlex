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
        "settlex-ui-field",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
