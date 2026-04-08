import { describe, expect, it } from "vitest";

const loadReplayPageClientModule = async () => {
  return import("../replays/replayClientState.js");
};

describe("replay client state", () => {
  it("maps archived chat messages into the live chat shape and clamps frame indexes", async () => {
    const {
      buildReplayChatMessages,
      clampReplayFrameIndex,
    } = await loadReplayPageClientModule();

    expect(
      buildReplayChatMessages([
        {
          id: "arch_1-chat-1",
          actorId: "0",
          message: "gg",
        },
      ])
    ).toEqual([
      {
        id: "arch_1-chat-1",
        sender: "0",
        payload: {
          message: "gg",
        },
      },
    ]);
    expect(clampReplayFrameIndex(99, 2)).toBe(1);
    expect(clampReplayFrameIndex(-2, 2)).toBe(0);
  });
});
