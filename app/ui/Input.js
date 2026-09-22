import React from "react";
import { cn } from "./cn";

export const Input = React.forwardRef(function Input(
  { className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "settlex-ui-field",
        className
      )}
      {...props}
    />
  );
});
