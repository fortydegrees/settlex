import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatPanel } from "../components/ChatPanel";

describe("ChatPanel", () => {
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
    expect(markup).toContain("disabled");
  });

  it("keeps the composer read-only when a seated player has no send transport", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ChatPanel, { playerID: "1" })
    );

    expect(markup).toContain('aria-label="Chat message"');
    expect(markup).toContain('placeholder="Read-only"');
    expect(markup).toContain("disabled");
  });
});
