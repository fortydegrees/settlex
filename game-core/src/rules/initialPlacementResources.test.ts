import { describe, expect, it } from "vitest";
import { createEmptyState } from "../core/state";
import { buildTopology, type BoardTile } from "../core/topology";
import { applyPlaceSettlement } from "./apply";
import { ResourceType, TileTypes } from "../types";

describe("initial placement resources", () => {
  it("grants resources only on the second placement", () => {
    const tiles: BoardTile[] = [
      {
        type: TileTypes.LAND,
        coordinate: [0, 0, 0],
        tile: {
          id: 1,
          resource: ResourceType.WOOD,
          nodes: { A: 1 }
        }
      },
      {
        type: TileTypes.LAND,
        coordinate: [1, -1, 0],
        tile: {
          id: 2,
          resource: ResourceType.BRICK,
          nodes: { A: 2 }
        }
      }
    ];
    const board = buildTopology(tiles);
    const state = createEmptyState(["0"]);
    state.phase = "placement";

    const first = applyPlaceSettlement(state, board, 1, "0", {
      initialPlacement: true
    });
    expect(first.ok).toBe(true);
    expect(first.distributions ?? []).toHaveLength(0);
    expect(state.playerStateById["0"].resources).toHaveLength(0);

    const second = applyPlaceSettlement(state, board, 2, "0", {
      initialPlacement: true
    });
    expect(second.ok).toBe(true);
    expect(second.distributions ?? []).toHaveLength(1);
    expect(second.distributions?.[0]).toEqual({
      tileId: 2,
      playerId: "0",
      resource: ResourceType.BRICK
    });
    expect(state.playerStateById["0"].resources).toEqual([
      ResourceType.BRICK
    ]);
  });

  it("ignores ports and desert tiles", () => {
    const tiles: BoardTile[] = [
      {
        type: TileTypes.LAND,
        coordinate: [0, 0, 0],
        tile: {
          id: 1,
          resource: ResourceType.SHEEP,
          nodes: { A: 5 }
        }
      },
      {
        type: TileTypes.LAND,
        coordinate: [1, -1, 0],
        tile: {
          id: 2,
          resource: ResourceType.DESERT,
          nodes: { A: 5 }
        }
      },
      {
        type: TileTypes.PORT,
        coordinate: [0, 1, -1],
        tile: {
          id: 3,
          resource: ResourceType.BRICK,
          nodes: { A: 5 }
        }
      }
    ];
    const board = buildTopology(tiles);
    const state = createEmptyState(["0"]);
    state.phase = "placement";

    const playerState = state.playerStateById["0"];
    playerState.settlementsRemaining =
      state.ruleset.pieceLimits.settlements - 1;

    const result = applyPlaceSettlement(state, board, 5, "0", {
      initialPlacement: true
    });
    expect(result.ok).toBe(true);
    expect(result.distributions ?? []).toHaveLength(1);
    expect(result.distributions?.[0]).toEqual({
      tileId: 1,
      playerId: "0",
      resource: ResourceType.SHEEP
    });
  });
});
