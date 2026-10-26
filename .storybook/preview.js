import React from "react";
import "../app/globals.css";
import "../app/_features/theme/hudGlass.css";
import { SETTLEHEX_TABLE_BACKGROUND } from "../app/_features/theme/backgrounds";
import { Outfit } from "next/font/google";
import { FocusModality } from "../app/ui/FocusModality";

const outfit = Outfit({ subsets: ["latin"] });

const preview = {
  decorators: [
    (Story, context) => {
      const isFullscreen = context.parameters.layout === "fullscreen";

      return React.createElement(
        "div",
        {
          className: `${outfit.className} min-h-screen text-ink-primary`,
          style: {
            background: SETTLEHEX_TABLE_BACKGROUND,
            padding: isFullscreen ? 0 : "var(--settlehex-ui-space-8)",
          },
        },
        // Base UI portals mount beside the story wrapper, so inherit the
        // production UI face from the preview document as well.
        React.createElement("style", null, `:root { --font-outfit: ${outfit.style.fontFamily}; } body { font-family: ${outfit.style.fontFamily}; }`),
        React.createElement(FocusModality),
        React.createElement(Story)
      );
    },
  ],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: {
        settlehexDesktop: {
          name: "SettleHex desktop (1440 × 900)",
          styles: { width: "1440px", height: "900px" },
        },
        settlehexMobile: {
          name: "SettleHex mobile (390 × 844)",
          styles: { width: "390px", height: "844px" },
        },
      },
    },
  },
};

export default preview;
