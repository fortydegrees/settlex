import { describe, it, expect } from "vitest";
import { spec } from "../spec";
import { generateBoard } from "../board/generateBoard";
import { makeDeterministicRng } from "../testUtils";
import { buildTopology } from "../core/topology";
import { createEmptyState } from "../core/state";
import { buildableNodes } from "./buildability";

describe("buildability - initial placement", () => {
  it("returns all land nodes when no buildings exist", () => {
    const tiles = generateBoard(spec, makeDeterministicRng(1));
    const board = buildTopology(tiles);
    const state = createEmptyState(["0", "1"]);

    const nodes = buildableNodes(state, board, "0", { initialPlacement: true });

    expect(nodes.slice().sort((a, b) => a - b)).toEqual(
      board.landNodeIds.slice().sort((a, b) => a - b)
    );
  });

  it("excludes nodes adjacent to an existing settlement", () => {
    const tiles = generateBoard(spec, makeDeterministicRng(2));
    const board = buildTopology(tiles);
    const state = createEmptyState(["0", "1"]);

    const occupied = board.landNodeIds[0];
    state.buildingsByNodeId[occupied] = { ownerId: "0", type: "settlement" };

    const nodes = buildableNodes(state, board, "0", { initialPlacement: true });
    const neighbors = board.nodeNeighbors[occupied] ?? [];

    expect(nodes).not.toContain(occupied);
    for (const n of neighbors) {
      expect(nodes).not.toContain(n);
    }
  });
});
