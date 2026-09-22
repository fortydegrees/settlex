import React from "react";
import "../app/globals.css";
import "../app/catana/components/hudGlass.css";
import { CATANA_TABLE_BACKGROUND } from "../app/catana/theme/backgrounds";
import { Outfit } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"] });

const preview = {
  decorators: [
    (Story, context) => {
      const isFullscreen = context.parameters.layout === "fullscreen";

      return React.createElement(
        "div",
        {
          className: `${outfit.className} min-h-screen text-slate-800`,
          style: {
            background: CATANA_TABLE_BACKGROUND,
            padding: isFullscreen ? 0 : "2rem",
          },
        },
        // Base UI portals mount beside the story wrapper, so inherit the
        // production UI face from the preview document as well.
        React.createElement("style", null, `body { font-family: ${outfit.style.fontFamily}; }`),
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
        catanaDesktop: {
          name: "Catana desktop (1440 × 900)",
          styles: { width: "1440px", height: "900px" },
        },
        catanaMobile: {
          name: "Catana mobile (390 × 844)",
          styles: { width: "390px", height: "844px" },
        },
      },
    },
  },
};

export default preview;
