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
});
