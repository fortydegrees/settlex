import { describe, expect, it } from "vitest";
import { BOARD_FAMILIES, generateCandidate } from "../generators/generateCandidate.mjs";
import {
  buildBoardFacts,
  CUBE_DIRECTIONS
} from "../analysis/boardFacts.mjs";

function expectRecursivelyFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) {
    expectRecursivelyFrozen(nested, seen);
  }
}

describe("board facts", () => {
  it("derives the complete standard topology and production totals", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const facts = buildBoardFacts(candidate.tiles);
    expect(facts.validityErrors).toEqual([]);
    expect(facts.nodes).toHaveLength(54);
    expect(facts.legalPairs).toHaveLength(1359);
    expect(facts.nodes.reduce((sum, node) => sum + node.totalPips, 0)).toBe(348);
    expect(facts.redAdjacencyPairs).toEqual([]);
  });

  it("records each node's blocked neighbours and resource vector", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const facts = buildBoardFacts(candidate.tiles);
    const node = facts.nodes.find((entry) => entry.totalPips > 0);
    expect(node.blockedNodeIds).toContain(node.nodeId);
    expect(Object.values(node.resourcePips).reduce((sum, value) => sum + value, 0)).toBe(node.totalPips);
  });

  it("reports structural count failures without throwing", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const facts = buildBoardFacts(candidate.tiles.slice(1));
    expect(facts.validityErrors).toContain("land-count");
  });

  it("snapshots input tiles and recursively freezes the returned board graph", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const facts = buildBoardFacts(candidate.tiles);
    const landIndex = candidate.tiles.findIndex((tile) => tile.tile.number != null);
    const resource = facts.tiles[landIndex].tile.resource;
    const coordinate = facts.tiles[landIndex].coordinate[0];
    const tileCount = facts.tiles.length;

    expect(facts.tiles).not.toBe(candidate.tiles);
    expect(facts.tiles[landIndex]).not.toBe(candidate.tiles[landIndex]);

    candidate.tiles[landIndex].tile.resource = "mutated";
    candidate.tiles[landIndex].coordinate[0] = 99;
    candidate.tiles.push(candidate.tiles[landIndex]);

    expect(facts.tiles[landIndex].tile.resource).toBe(resource);
    expect(facts.tiles[landIndex].coordinate[0]).toBe(coordinate);
    expect(facts.tiles).toHaveLength(tileCount);
    expect(facts.topology.tiles).toHaveLength(tileCount);
    expectRecursivelyFrozen(facts.tiles);
    expectRecursivelyFrozen(facts.topology);
  });

  it("freezes every cube direction tuple", () => {
    expect(Object.isFrozen(CUBE_DIRECTIONS)).toBe(true);
    for (const direction of CUBE_DIRECTIONS) {
      expect(Object.isFrozen(direction)).toBe(true);
    }
    expect(() => CUBE_DIRECTIONS[0].push(0)).toThrow(TypeError);
  });
});
