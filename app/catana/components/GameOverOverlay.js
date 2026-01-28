import React from "react";

export function GameOverOverlay({ children }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-blue-900/40 backdrop-blur-sm">
      {children}
    </div>
  );
}
