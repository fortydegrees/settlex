import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { measureOpportunityDepth } from "../analysis/opportunityDepth.mjs";
import { measureResourceContestability } from "../analysis/resourceAccess.mjs";

const node = (nodeId, generalScore, wheat, blockedNodeIds) => ({
  nodeId,
  generalScore,
  totalPips: Math.max(generalScore - 1, 0),
  diversity: 2,
  blockedNodeIds,
  resourcePips: {
    [ResourceType.WOOD]: 0,
    [ResourceType.BRICK]: 0,
    [ResourceType.SHEEP]: 0,
    [ResourceType.WHEAT]: wheat,
    [ResourceType.ORE]: 0
  }
});

const profile = {
  competitiveSpotRatio: 0.75,
  viableResourceRatio: 0.5
};

describe("duel fairness metrics", () => {
  it("detects a steep top-spot cliff", () => {
    const metrics = measureOpportunityDepth([
      node(1, 12, 0, [1]), node(2, 7, 0, [2]), node(3, 7, 0, [3]), node(4, 7, 0, [4])
    ], profile);
    expect(metrics.topSpotCliff).toBeCloseTo(5 / 12);
    expect(metrics.competitiveSpotCount).toBe(1);
  });

  it("distinguishes scarce fair wheat from a wheat monopoly", () => {
    const fairNodes = [node(1, 8, 3, [1, 2]), node(2, 8, 3, [1, 2]), node(3, 7, 2, [3]), node(4, 7, 2, [4])];
    const monopolyNodes = [node(1, 10, 7, [1, 2, 3]), node(2, 7, 1, [1, 2]), node(3, 7, 1, [1, 3]), node(4, 7, 1, [4])];
    const fair = measureResourceContestability({ nodes: fairNodes }, fairNodes, profile);
    const monopoly = measureResourceContestability({ nodes: monopolyNodes }, monopolyNodes, profile);
    expect(fair.byResource[ResourceType.WHEAT].secondIndependentRatio).toBeCloseTo(2 / 3);
    expect(monopoly.byResource[ResourceType.WHEAT].secondIndependentRatio).toBeCloseTo(1 / 7);
  });
});
