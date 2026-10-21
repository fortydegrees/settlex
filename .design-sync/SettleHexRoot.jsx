// The root wrapper every SettleHex surface renders inside.
//
// This distils two things the components themselves do not carry:
//   · app/layout.js — the `settlex-ui-root` stacking context and the Outfit body
//     font applied to <body>.
//   · .storybook/preview.js — the Catana table background every story sits on.
//
// It exists as a real bundle export for two reasons. `cfg.provider` needs a
// named export to wrap previews in (decorator-only wrapping ships a generic
// "wrap this yourself" note in the generated README and prompt.md), and the
// design agent needs something concrete to wrap its own screens in — without
// this, designs render on a bare white page and read as off-brand even when
// every component inside them is correct.
//
// Padding is 0 deliberately: .storybook/preview.js sets `layout: "fullscreen"`
// globally, so the repo's own decorator contributes no padding either.

import React from "react";
import { CATANA_TABLE_BACKGROUND } from "../app/catana/theme/backgrounds";

export function SettleHexRoot({ children, className = "", style = null }) {
  return (
    <div
      className={`settlex-ui-root min-h-screen text-slate-800 ${className}`}
      style={{
        background: CATANA_TABLE_BACKGROUND,
        fontFamily: 'Outfit, ui-rounded, "Nunito Sans", system-ui, sans-serif',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
