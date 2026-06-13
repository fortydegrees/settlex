import { describe, expect, it, vi } from "vitest";
import { createEmptyState } from "@settlex/game-core";
import { placeRoad } from "../moves/buildMoves";

vi.mock("@settlex/game-core", async () => {
  const actual = await vi.importActual("@settlex/game-core");
  return {
    ...actual,
    applyPlaceRoad: vi.fn((state, _topology, _edgeId, playerId) => {
      state.playerStateById[playerId].roadsRemaining -= 1;
      return { ok: true };
    })
  };
});

const makeContext = () => {
  const core = createEmptyState(["0", "1"]);
  const { pieceLimits } = core.ruleset;

  core.playerStateById["0"].settlementsRemaining = pieceLimits.settlements - 2;
  core.playerStateById["0"].roadsRemaining = pieceLimits.roads - 1;
  core.playerStateById["1"].settlementsRemaining = pieceLimits.settlements - 2;
  core.playerStateById["1"].roadsRemaining = pieceLimits.roads - 2;

  return {
    G: {
      core,
      coreTopology: {
        landNodeIds: [],
        nodeNeighbors: {},
        nodeEdges: {},
        edgeNodes: {},
        tiles: []
      }
    },
    ctx: {
      phase: "placement",
      currentPlayer: "0",
      activePlayers: { "0": "road" },
      numPlayers: 2,
      turn: 1
    },
    playerID: "0",
    events: {
      endTurn: vi.fn()
    }
  };
};

describe("placement logging", () => {
  it("omits turn divider when placement completes", () => {
    const context = makeContext();

    placeRoad.move(context, "1,2");

    expect(context.G.gameLog.some((entry) => entry.type === "turn:end")).toBe(false);
    expect(context.G.gameLog.some((entry) => entry.type === "build:road")).toBe(true);
  });
});
