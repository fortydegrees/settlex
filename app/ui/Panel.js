import React from "react";
import { cn } from "./cn";

export function Panel({
  title,
  right = null,
  className = "",
  bodyClassName = "",
  children,
}) {
  const hasHeader = Boolean(title || right);

  return (
    <div
      className={cn(
        "settlex-ui-pane overflow-hidden",
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-ui-3 border-b border-edge-subtle px-ui-5 py-ui-4 md:px-ui-6">
          <div className="flex min-w-0 items-center gap-ui-3">
            <div className="settlex-ui-heading min-w-0">
              {title}
            </div>
          </div>
          {right}
        </div>
      )}

      <div className={cn("p-ui-5 md:p-ui-6", bodyClassName)}>{children}</div>
    </div>
  );
}
