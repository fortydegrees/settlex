import { expect, it } from "vitest";
import { buildReplayGameScreenProps } from "../_features/replay/replayGameScreenProps";
import { buildReplayTimeline } from "../_features/replay/replayTimeline";

it.each([false, true])(
  "keeps future log entries out of an earlier board position (annotated %s)",
  (annotated) => {
    const roll = { id: "roll", type: "roll", actorId: "1", data: { dice: [2, 3] } };
    const steal = {
      id: "steal", type: "robber:steal", actorId: "2",
      data: { victimId: "1", resource: "Ore" },
    };
    const frames = [[], [roll], [roll, steal]].map((gameLog, index) => ({
      index,
      state: { G: { gameLog, core: {} }, ctx: { turn: index + 1 } },
      ...(annotated ? { annotation: { label: "Position", notes: [] } } : {}),
    }));
    const timeline = buildReplayTimeline({ frames, getVictoryPointsForState: () => 0 });
    const first = timeline.events[0];
    const fullLog = timeline.events.at(-1).visibleLogEntries;
    const props = buildReplayGameScreenProps({
      event: first, logEntries: fullLog, perspectiveId: "1",
    });
    expect(props.replayLogEntries.map((entry) => entry.id)).toEqual([]);
    expect(props.G).toBe(first.state.G);
    expect(props.replayTurn).toBe(1);
    expect(props.replayActiveLogEntryKey).toBe(first.logEntryKey);
    const target = timeline.events[timeline.logEventIndexByKey.steal];
    expect(target.state.ctx.turn).toBe(3);
    const hidden = buildReplayGameScreenProps({
      event: first, logEntries: fullLog, perspectiveId: null, revealAllHands: false,
    });
    expect(hidden.replayLogEntries).toEqual([]);
    expect(fullLog[1].data.resource).toBe("Ore");
  }
);

it("projects the selected historical frame and player perspective", () => {
  const state = {
    G: {
      core: {
        playerStateById: {
          "1": { resources: ["Wood"], devCards: ["Knight"] },
        },
      },
    },
    ctx: { currentPlayer: "1" },
    plugins: {},
  };
  const props = buildReplayGameScreenProps({
    event: { state, turn: 7, visibleLogEntries: [], logEntryKey: null },
    perspectiveId: "1",
    matchID: "m1",
    matchData: [],
    resultsOpen: false,
  });
  expect(props.G).toBe(state.G);
  expect(props.playerID).toBe("1");
  expect(props.G.core.playerStateById["1"].devCards).toEqual(["Knight"]);
  expect(props.isReplay).toBe(true);
  expect(props.replayTurn).toBe(7);
  expect(props.moves.rollDice()).toBeUndefined();
});

it.each([["0", "Ore"], ["1", "Ore"], ["2", undefined], [null, undefined]])(
  "projects stolen-resource log details for replay perspective %s",
  (perspectiveId, resource) => {
    const entries = [{ id: 1, type: "robber:steal", actorId: "0",
      data: { victimId: "1", resource: "Ore" } }];
    const props = buildReplayGameScreenProps({
      event: { state: {}, visibleLogEntries: entries }, perspectiveId, revealAllHands: false
    });
    expect(props.replayLogEntries[0].data.resource).toBe(resource);
    expect(entries[0].data.resource).toBe("Ore");
  }
);

it("suppresses result entry for a partial capture while keeping archived defaults", () => {
  expect(buildReplayGameScreenProps({event:{state:{}},isComplete:false}).replayCanShowResults).toBe(false);
  expect(buildReplayGameScreenProps({event:{state:{}}}).replayCanShowResults).toBe(true);
});
