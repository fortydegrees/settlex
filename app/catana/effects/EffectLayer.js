import React, { forwardRef } from "react";
import ReactDOM from "react-dom";

export const EffectLayer = forwardRef(function EffectLayer(_, ref) {
  if (typeof document === "undefined") {
    return null;
  }

  const node = (
    <div
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1000
      }}
    />
  );

  return ReactDOM.createPortal(node, document.body);
});
