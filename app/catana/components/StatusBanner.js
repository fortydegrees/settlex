"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Banner } from "../../ui/Banner";
import { cn } from "../../ui/cn";

export function StatusBanner({
  variant = "neutral",
  title,
  body = null,
  actions = null,
  className = "",
  overlay = false,
  overlayClassName = "",
}) {
  const [mounted, setMounted] = useState(false);
  const banner = (
    <Banner
      variant={variant}
      title={title}
      body={body}
      actions={actions}
      className={className}
    />
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!overlay) {
    return banner;
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-3 settlex-ui-layer-status flex justify-center px-4",
        overlayClassName
      )}
    >
      <Banner
        variant={variant}
        title={title}
        body={body}
        actions={actions}
        className={cn("pointer-events-auto w-full max-w-2xl", className)}
      />
    </div>,
    document.body
  );
}
