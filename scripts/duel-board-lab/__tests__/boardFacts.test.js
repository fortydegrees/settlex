import { describe, expect, it } from "vitest";
import { BOARD_FAMILIES, generateCandidate } from "../generators/generateCandidate.mjs";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";

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
});
