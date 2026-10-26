import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatPanel } from "../ChatPanel";

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

  it.each([null, "1"])("omits the composer when sending is unavailable (player %s)", (playerID) => {
    const markup = renderToStaticMarkup(
      React.createElement(ChatPanel, {
        playerID,
        chatMessages: [],
        playerMap: {
          "1": { name: "Ada", emoji: "🦊", color: "blue" },
        },
        themeId: "classic",
      })
    );

    expect(markup).toContain("No messages yet.");
    expect(markup).not.toContain("<input");
    expect(markup).not.toContain("<form");
    expect(markup).not.toContain("Spectators can read chat only");
    expect(markup).not.toContain('placeholder="Read-only"');
  });

});
