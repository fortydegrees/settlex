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
        <div className="flex items-center justify-between gap-3 border-b border-blue-100/70 px-5 py-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="settlex-ui-heading min-w-0">
              {title}
            </div>
          </div>
          {right}
        </div>
      )}

      <div className={cn("p-5 md:p-6", bodyClassName)}>{children}</div>
    </div>
  );
}
