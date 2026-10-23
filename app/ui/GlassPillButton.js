import React from "react";
import { Button } from "./Button";

export function GlassPillButton({ className = "", children, ...props }) {
  return (
    <Button type="button" variant="pill" className={className} {...props}>
      {children}
    </Button>
  );
}
