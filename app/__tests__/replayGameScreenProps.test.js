import { expect, it } from "vitest";
import { buildReplayGameScreenProps } from "../replays/replayGameScreenProps";

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
      event: { state: {}, visibleLogEntries: entries }, perspectiveId
    });
    expect(props.replayLogEntries[0].data.resource).toBe(resource);
    expect(entries[0].data.resource).toBe("Ore");
  }
);
