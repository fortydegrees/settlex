import { describe, expect, it } from "vitest";
import { buildChatPreviewEntries } from "../utils/chatPreview";

describe("buildChatPreviewEntries", () => {
  it("uses the current player plus one opponent when available", () => {
    const entries = buildChatPreviewEntries({
      playerID: "1",
      playerMap: {
        "1": { name: "Ada", emoji: "🦊", color: "blue" },
        "2": { name: "Bren", emoji: "🐻", color: "rose" },
        "3": { name: "Cory", emoji: "🐼", color: "lime" },
      },
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      id: "chat-preview-0",
      actorId: "1",
    });
    expect(entries[1]).toMatchObject({
      id: "chat-preview-1",
      actorId: "2",
    });
  });

  it("falls back gracefully when only one seat exists", () => {
    const entries = buildChatPreviewEntries({
      playerID: "7",
      playerMap: {
        "7": { name: "Solo", emoji: "🦊", color: "blue" },
      },
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.actorId)).toEqual(["7", "7"]);
  });

  it("keeps an explicit playerID as the current speaker even when it is not in the player map", () => {
    const entries = buildChatPreviewEntries({
      playerID: "7",
      playerMap: {
        "1": "Ada",
        "2": "Bren",
      },
    });

    expect(entries.map((entry) => entry.actorId)).toEqual(["7", "1"]);
  });

  it("keeps preview ids stable across renders", () => {
    const first = buildChatPreviewEntries({
      playerID: "1",
      playerMap: {
        "1": "Ada",
        "2": "Bren",
      },
    });
    const second = buildChatPreviewEntries({
      playerID: "1",
      playerMap: {
        "2": "Bren",
        "1": "Ada",
      },
    });

    expect(first.map((entry) => entry.id)).toEqual([
      "chat-preview-0",
      "chat-preview-1",
    ]);
    expect(second.map((entry) => entry.id)).toEqual([
      "chat-preview-0",
      "chat-preview-1",
    ]);
  });
});
