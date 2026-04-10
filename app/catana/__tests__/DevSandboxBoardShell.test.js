import { describe, expect, it } from "vitest";
import { buildSandboxActivePlayers } from "../dev/sandbox/activePlayers";

describe("buildSandboxActivePlayers", () => {
  it("aligns post-roll sandbox scenarios with the postRoll stage", () => {
    expect(
      buildSandboxActivePlayers({
        core: {
          players: ["0", "1", "2", "3"],
          phase: "normal",
          turn: {
            currentPlayerId: "0",
            phase: "postRoll"
          }
        }
      })
    ).toEqual({
      0: "postRoll",
      1: null,
      2: null,
      3: null
    });
  });

  it("keeps robber discard scenarios on the pending discarder seats", () => {
    expect(
      buildSandboxActivePlayers({
        core: {
          players: ["0", "1", "2", "3"],
          phase: "normal",
          turn: {
            currentPlayerId: "0",
            phase: "robberDiscard",
            pendingDiscards: ["1", "3"]
          }
        }
      })
    ).toEqual({
      0: null,
      1: "robberDiscard",
      2: null,
      3: "robberDiscard"
    });
  });

  it("keeps road-placement sandbox scenarios on the road stage", () => {
    expect(
      buildSandboxActivePlayers({
        core: {
          players: ["0", "1", "2", "3"],
          phase: "placement",
          turn: {
            currentPlayerId: "0"
          },
          pendingRoadFromNodeIdByPlayer: {
            0: "1,2,3"
          }
        },
        valids: {
          edges: []
        }
      })
    ).toEqual({
      0: "road",
      1: null,
      2: null,
      3: null
    });
  });
});
