import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatPanel } from "../components/ChatPanel";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const componentPath = path.resolve(__dirname, "..", "components", "ChatPanel.js");

describe("ChatPanel", () => {
  it("references the shared feed shell and token row", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("FeedPanel");
    expect(contents).toContain("FeedTokenRow");
    expect(contents).toContain("formatChatEntry");
    expect(contents).toContain("buildChatPreviewEntries");
  });

  it("renders preview-only chat chrome with a disabled composer", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ChatPanel, {
        playerID: "1",
        playerMap: {
          "1": { name: "Ada", emoji: "🦊", color: "blue" },
          "2": { name: "Bren", emoji: "🐻", color: "rose" },
        },
        themeId: "classic",
      })
    );

    expect(markup).toContain("Chat");
    expect(markup).toContain("Preview only");
    expect(markup).toContain("coming soon");
    expect(markup).toContain("Ada");
    expect(markup).toContain("🦊");
    expect(markup).toContain("Ready when you are.");
    expect(markup).toContain("disabled");
    expect(markup).toContain("Send");
    expect(markup).toContain("feed-panel-scroll");
    expect(markup).toContain("feed-panel-entry");
  });
});
