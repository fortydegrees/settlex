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
  it("references the shared feed shell and live chat helpers", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("FeedPanel");
    expect(contents).toContain("FeedTokenRow");
    expect(contents).toContain("formatChatEntry");
    expect(contents).toContain("buildChatEntries");
    expect(contents).toContain("submitChatDraft");
  });

  it("renders live chat messages with a footer composer inside the chat panel", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ChatPanel, {
        playerID: "1",
        chatMessages: [
          { id: "m1", sender: "1", payload: "Ready to play?" },
          { id: "m2", sender: "2", payload: { message: "Let's go!" } },
        ],
        sendChatMessage: () => {},
        playerMap: {
          "1": { name: "Ada", emoji: "🦊", color: "blue" },
          "2": { name: "Bren", emoji: "🐻", color: "rose" },
        },
        themeId: "classic",
      })
    );

    expect(markup).toContain("Chat");
    expect(markup).toContain("Ada");
    expect(markup).toContain("🦊");
    expect(markup).toContain("Ready to play?");
    expect(markup).toContain("Let&#x27;s go!");
    expect(markup).toContain('placeholder="Message..."');
    expect(markup).toContain("feed-panel-scroll");
    expect(markup).toContain("feed-panel-entry");
    expect(markup).not.toContain("Preview only");
    expect(markup).not.toContain("Coming soon");
    expect(markup).not.toContain("Enter to send");
    expect(markup).not.toContain("Ephemeral match chat");
    expect(markup).not.toContain("flex-wrap");
    expect(markup).not.toContain("fixed right-4 bottom-4");
    expect(markup).not.toContain("md:w-96");
  });

  it("renders a disabled read-only composer for spectators", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ChatPanel, {
        playerID: null,
        chatMessages: [],
        playerMap: {
          "1": { name: "Ada", emoji: "🦊", color: "blue" },
        },
        themeId: "classic",
      })
    );

    expect(markup).toContain("No messages yet.");
    expect(markup).toContain('placeholder="Read-only"');
    expect(markup).not.toContain("Spectators can read chat only");
    expect(markup).toContain("disabled");
  });
});
