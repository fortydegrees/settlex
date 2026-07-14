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
    event: { state, visibleLogEntries: [], logEntryKey: null },
    perspectiveId: "1",
    matchID: "m1",
    matchData: [],
    resultsOpen: false,
  });
  expect(props.G).toBe(state.G);
  expect(props.playerID).toBe("1");
  expect(props.G.core.playerStateById["1"].devCards).toEqual(["Knight"]);
  expect(props.isReplay).toBe(true);
  expect(props.moves.rollDice()).toBeUndefined();
});
