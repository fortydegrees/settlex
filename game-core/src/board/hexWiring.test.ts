import { describe, expect, it } from "vitest";
import {
  coordinateKey,
  buildCoordinateIndex,
  getNodesAndEdgesForTile
} from "./hexWiring";

describe("hexWiring helpers", () => {
  it("creates stable coordinate keys", () => {
    expect(coordinateKey([0, 0, 0])).toBe("0|0|0");
    expect(coordinateKey([-1, 2, -1])).toBe("-1|2|-1");
  });

  it("builds an O(1) index for coordinate lookups", () => {
    const tiles = [
      { coordinate: [0, 0, 0] as [number, number, number], tile: {} },
      { coordinate: [1, -1, 0] as [number, number, number], tile: {} }
    ];

    const byCoord = buildCoordinateIndex(tiles);
    expect(byCoord.get(coordinateKey([1, -1, 0]))).toBe(tiles[1]);
    expect(byCoord.get(coordinateKey([3, 0, -3]))).toBeUndefined();
  });

  it("reuses neighbor wiring when neighbors are already resolved", () => {
    const tiles = [
      {
        coordinate: [0, 0, 0] as [number, number, number],
        tile: {}
      },
      {
        coordinate: [1, -1, 0] as [number, number, number],
        tile: {
          nodes: {
            NORTHWEST: 100,
            SOUTHWEST: 101
          },
          edges: {
            WEST: [100, 101] as [number, number]
          }
        }
      }
    ];

    const byCoord = buildCoordinateIndex(tiles);
    const { nodes, edges } = getNodesAndEdgesForTile({
      tilesByCoord: byCoord,
      coordinate: [0, 0, 0],
      nodeAutoinc: 0,
      edgeAutoinc: 0,
      sortEdgeNodes: false
    });

    expect(nodes.NORTHEAST).toBe(100);
    expect(nodes.SOUTHEAST).toBe(101);
    expect(edges.EAST).toEqual([100, 101]);
    expect(Object.values(nodes)).toHaveLength(6);
    expect(Object.values(edges)).toHaveLength(6);
  });

  it("throws when neighbor wiring is partially defined", () => {
    const tiles = [
      {
        coordinate: [0, 0, 0] as [number, number, number],
        tile: {}
      },
      {
        coordinate: [1, -1, 0] as [number, number, number],
        tile: {
          nodes: {
            NORTHWEST: 1,
            SOUTHWEST: 2
          }
        }
      }
    ];

    const byCoord = buildCoordinateIndex(tiles);
    expect(() =>
      getNodesAndEdgesForTile({
        tilesByCoord: byCoord,
        coordinate: [0, 0, 0],
        nodeAutoinc: 0,
        edgeAutoinc: 0
      })
    ).toThrow(/incomplete neighbor topology/i);
  });
});
