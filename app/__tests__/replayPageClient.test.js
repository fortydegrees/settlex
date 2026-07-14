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

  it("maps only step-navigation keyboard shortcuts", async () => {
    const { getReplayKeyboardAction } =
      await loadReplayPageClientModule();

    expect(getReplayKeyboardAction({ key: "ArrowLeft" })).toBe(
      "previousEvent"
    );
    expect(
      getReplayKeyboardAction({ key: "ArrowRight", shiftKey: true })
    ).toBe("nextTurn");
    expect(
      getReplayKeyboardAction({ key: "ArrowRight", metaKey: true })
    ).toBeNull();
    expect(getReplayKeyboardAction({ key: " " })).toBeNull();
  });

  it("projects raw frames into meaningful log events, turns, and VP samples", async () => {
    const { buildReplayTimeline } = await import(
      "../replays/replayTimeline.js"
    );
    const participants = [
      {
        seatId: "0",
        usernameSnapshot: "Ada",
        avatarColorSnapshot: "gold",
      },
      {
        seatId: "1",
        usernameSnapshot: "Bren",
        avatarColorSnapshot: "blue",
      },
    ];
    const makeState = (gameLog, turn, scores) => ({
      G: { gameLog, core: { turn }, scores },
      ctx: {},
    });
    const roll = {
      id: 1,
      turn: 1,
      type: "roll",
      actorId: "0",
      data: { dice: [3, 4] },
    };
    const gain = {
      id: 2,
      turn: 1,
      type: "resource:gain",
      actorId: "0",
      data: { resources: { Wood: 1 } },
    };
    const divider = {
      id: 3,
      turn: 1,
      type: "turn:end",
      data: { divider: true },
    };
    const settlement = {
      id: 4,
      turn: 2,
      type: "build:settlement",
      actorId: "1",
      data: {},
    };
    const frames = [
      {
        index: 0,
        state: makeState([], 1, { "0": 0, "1": 0 }),
        logEntry: null,
      },
      {
        index: 1,
        state: makeState([roll, gain], 1, { "0": 0, "1": 0 }),
        logEntry: {
          action: { type: "MAKE_MOVE", payload: { type: "rollDice" } },
        },
      },
      {
        index: 2,
        state: makeState(
          [roll, gain, divider, settlement],
          2,
          { "0": 0, "1": 1 }
        ),
        logEntry: {
          action: {
            type: "MAKE_MOVE",
            payload: { type: "placeSettlement" },
          },
        },
      },
    ];

    const timeline = buildReplayTimeline({
      frames,
      participants,
      getVictoryPointsForState: (state, playerId) =>
        state.G.scores[playerId],
    });

    expect(timeline.events.map((event) => event.label)).toEqual([
      "Initial setup",
      "Ada rolled 7",
      "Ada received Wood",
      "Bren placed a settlement",
    ]);
    expect(timeline.events[1].frameIndex).toBe(1);
    expect(timeline.events[1].visibleLogEntries).toEqual([roll]);
    expect(timeline.events[2].visibleLogEntries).toEqual([roll, gain]);
    expect(timeline.events[3].visibleLogEntries).toEqual([
      roll,
      gain,
      divider,
      settlement,
    ]);
    expect(timeline.logEventIndexByKey["4"]).toBe(3);
    expect(timeline.logEventIndexByKey["3"]).toBe(3);
    expect(timeline.turnStarts).toEqual([
      { turn: 1, eventIndex: 0 },
      { turn: 2, eventIndex: 3 },
    ]);
    expect(timeline.scoreSeries[3]).toEqual({
      eventIndex: 3,
      turn: 2,
      scoresByPlayerId: { "0": 0, "1": 1 },
    });
  });

  it("keeps hidden victory-point development cards out of the replay graph", async () => {
    const { buildReplayTimeline } = await import(
      "../replays/replayTimeline.js"
    );
    const core = {
      buildingsByNodeId: {
        a: { ownerId: "0", type: "settlement" },
      },
      playerStateById: {
        "0": { devCards: ["victoryPoint"] },
        "1": { devCards: [] },
      },
      awards: {
        longestRoadOwnerId: null,
        largestArmyOwnerId: null,
      },
      turn: 1,
    };

    const timeline = buildReplayTimeline({
      frames: [
        {
          index: 0,
          state: { G: { core, gameLog: [] }, ctx: {} },
          logEntry: null,
        },
      ],
      participants: [{ seatId: "0" }, { seatId: "1" }],
    });

    expect(timeline.scoreSeries[0].scoresByPlayerId).toEqual({
      "0": 1,
      "1": 0,
    });
  });

  it("falls back to raw action frames without structured game-log events", async () => {
    const { buildReplayTimeline } = await import(
      "../replays/replayTimeline.js"
    );
    const frames = [
      {
        index: 0,
        state: { G: { core: { turn: 1 } }, ctx: {} },
        logEntry: null,
      },
      {
        index: 1,
        state: { G: { core: { turn: 1 } }, ctx: {} },
        logEntry: {
          action: { type: "MAKE_MOVE", payload: { type: "rollDice" } },
        },
      },
      {
        index: 2,
        state: { G: { core: { turn: 1 } }, ctx: {} },
        logEntry: { action: { type: "PLUGIN" } },
      },
    ];

    const timeline = buildReplayTimeline({ frames, participants: [] });

    expect(timeline.events.map((event) => event.label)).toEqual([
      "Initial setup",
      "Rolled dice",
      "Game updated",
    ]);
  });

  it("uses human-readable labels for known legacy fallback actions", async () => {
    const { buildReplayTimeline } = await import(
      "../replays/replayTimeline.js"
    );
    const actions = [
      "autoRoll",
      "placeRoadFromDevCard",
      "playDevCardStart",
      "discardResources",
      "resign",
    ];
    const frames = [
      {
        index: 0,
        state: { G: { core: { turn: 1 } }, ctx: {} },
        logEntry: null,
      },
      ...actions.map((type, index) => ({
        index: index + 1,
        state: { G: { core: { turn: index + 1 } }, ctx: {} },
        logEntry: {
          action: { type: "MAKE_MOVE", payload: { type } },
        },
      })),
    ];

    expect(
      buildReplayTimeline({ frames }).events.map((event) => event.label)
    ).toEqual([
      "Initial setup",
      "Rolled dice",
      "Placed a road",
      "Played a development card",
      "Discarded resources",
      "Resigned",
    ]);
  });
});
