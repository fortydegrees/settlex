import { describe, expect, it } from "vitest";
import {
  STANDARD_BOARD_LAND_COORDS,
  buildHexBoundaryEdges,
  orderBoundaryLoop,
} from "../../utils/boardUnderlayGeometry";

const pointKey = ([x, y]) => `${x},${y}`;
const edgeKey = ([start, end]) => {
  const ordered = [pointKey(start), pointKey(end)].sort();
  return `${ordered[0]}|${ordered[1]}`;
};

describe("boardUnderlayGeometry", () => {
  it("builds one ordered perimeter loop for the standard board", () => {
    const edges = buildHexBoundaryEdges(STANDARD_BOARD_LAND_COORDS);
    expect(edges).toHaveLength(30);

    const loop = orderBoundaryLoop(edges);
    expect(loop.closed).toBe(true);
    expect(loop.points).toHaveLength(30);

    const boundaryEdgeKeys = new Set(
      edges.map(({ start, end }) => edgeKey([start, end]))
    );
    const orderedLoopEdgeKeys = loop.points.map((point, index) =>
      edgeKey([point, loop.points[(index + 1) % loop.points.length]])
    );

    expect(new Set(loop.points.map(pointKey)).size).toBe(loop.points.length);
    expect(new Set(orderedLoopEdgeKeys).size).toBe(edges.length);
    expect(new Set(orderedLoopEdgeKeys)).toEqual(boundaryEdgeKeys);
  });
});
