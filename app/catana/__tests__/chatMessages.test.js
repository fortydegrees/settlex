import { describe, expect, it, vi } from "vitest";
import {
  buildChatEntries,
  submitChatDraft,
} from "../utils/chatMessages";

describe("buildChatEntries", () => {
  it("maps boardgame.io string payloads into chat entries", () => {
    const entries = buildChatEntries([
      { id: "m1", sender: "1", payload: "Ready to play?" },
      { id: "m2", sender: "2", payload: "Let's go!" },
    ]);

    expect(entries).toEqual([
      { id: "m1", actorId: "1", message: "Ready to play?" },
      { id: "m2", actorId: "2", message: "Let's go!" },
    ]);
  });

  it("reads object payload messages and skips blank payloads", () => {
    const entries = buildChatEntries([
      { id: "m1", sender: "1", payload: { message: "Hello", time: 1 } },
      { id: "m2", sender: "2", payload: { message: "   " } },
      { id: "m3", sender: "3", payload: { time: 2 } },
    ]);

    expect(entries).toEqual([
      { id: "m1", actorId: "1", message: "Hello" },
    ]);
  });
});

describe("submitChatDraft", () => {
  it("sends a trimmed message and clears the draft for players", () => {
    const sendChatMessage = vi.fn();

    const result = submitChatDraft({
      draft: "  hello there  ",
      playerID: "1",
      sendChatMessage,
    });

    expect(sendChatMessage).toHaveBeenCalledWith("hello there");
    expect(result).toEqual({ sent: true, nextDraft: "" });
  });

  it("does not send blank drafts or spectator drafts", () => {
    const sendChatMessage = vi.fn();

    expect(
      submitChatDraft({
        draft: "   ",
        playerID: "1",
        sendChatMessage,
      })
    ).toEqual({ sent: false, nextDraft: "   " });

    expect(
      submitChatDraft({
        draft: "hello",
        playerID: null,
        sendChatMessage,
      })
    ).toEqual({ sent: false, nextDraft: "hello" });

    expect(sendChatMessage).not.toHaveBeenCalled();
  });
});
