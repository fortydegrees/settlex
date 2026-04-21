import React from "react";
import { Banner } from "../../ui/Banner";

export function StatusBanner({
  variant = "neutral",
  title,
  body = null,
  actions = null,
  className = "",
}) {
  return (
    <Banner
      variant={variant}
      title={title}
      body={body}
      actions={actions}
      className={className}
    />
  );
}
