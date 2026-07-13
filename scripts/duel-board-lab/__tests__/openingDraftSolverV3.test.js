import { describe, expect, it } from "vitest";
import { solveOpeningDraftV3 } from "../analysis/openingDraftSolverV3.mjs";

function makeFacts(blockedByNodeId) {
  return {
    nodes: blockedByNodeId.map((blockedNodeIds, nodeId) => ({ nodeId, blockedNodeIds }))
  };
}

const weightedTerminal = (weights) => ([p1First, p2First, p2Second, p1Second]) => ({
  p1Value: weights[p1First] + weights[p1Second],
  p2Value: weights[p2First] + weights[p2Second]
});

describe("duel-fair-v3 bounded opening solver", () => {
  it("solves the P1, P2, P2, P1 minimax order with stable ties", () => {
    const candidateNodeIds = [0, 1, 2, 3, 4, 5];
    const result = solveOpeningDraftV3({
      facts: makeFacts(candidateNodeIds.map((nodeId) => [nodeId])),
      candidateNodeIds,
      terminalEvaluator: weightedTerminal([6, 5, 4, 3, 2, 1]),
      precision: 1e-12
    });

    expect(result.selectedNodeIds).toEqual([0, 1, 2, 3]);
    expect(result.selectedLine.map(({ player }) => player)).toEqual(["P1", "P2", "P2", "P1"]);
    expect(result.normalizedAdvantage).toBe(0);
    expect(result.rawSequenceCount).toBe(360);
    expect(result.legalSequenceCount).toBe(360);
  });

  it("applies distance-rule blocking immediately", () => {
    const result = solveOpeningDraftV3({
      facts: makeFacts([[0, 1], [0, 1], [2], [3], [4], [5]]),
      candidateNodeIds: [0, 1, 2, 3, 4, 5],
      terminalEvaluator: weightedTerminal([6, 5, 4, 3, 2, 1]),
      precision: 1e-12
    });

    expect(result.selectedNodeIds).not.toContain(1);
    expect(result.legalSequenceCount).toBeLessThan(result.rawSequenceCount);
  });

  it("uses the conservative four-permutation bounds", () => {
    const rawCount = (count) => count * (count - 1) * (count - 2) * (count - 3);

    expect(rawCount(16)).toBe(43_680);
    expect(rawCount(20)).toBe(116_280);
  });
});
