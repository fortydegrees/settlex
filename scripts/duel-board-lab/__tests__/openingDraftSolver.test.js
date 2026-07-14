import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { solveOpeningDraft } from "../analysis/openingDraftSolver.mjs";
import { valueOpeningPortfolio } from "../analysis/openingPolicy.mjs";

const FEATURE_KEYS = Object.freeze([
  "totalProductionPips", "producedResourceCount", "missingProducedResourceCount",
  "directRoad", "directSettlement", "directDevCard", "directCity",
  "surplusRoad", "surplusSettlement", "surplusDevCard", "surplusCity",
  "tradeRoad", "tradeSettlement", "tradeDevCard", "tradeCity",
  "immediateRoad", "immediateSettlement", "immediateDevCard", "immediateCity",
  "ownedPortCount", "oneRoadExpansionCount", "twoRoadExpansionCount",
  "productionConcentration"
]);

const TEST_POLICY = Object.freeze({
  name: "synthetic-denial",
  weights: Object.freeze(Object.fromEntries(FEATURE_KEYS.map((key) => [key, ({
    totalProductionPips: 0.1,
    directRoad: 5,
    directSettlement: 5,
    directDevCard: 5,
    directCity: 3
  })[key] ?? 0])))
});

const EXPANSION_POLICY = Object.freeze({
  name: "synthetic-expansion",
  weights: Object.freeze({
    ...TEST_POLICY.weights,
    oneRoadExpansionCount: 1,
    twoRoadExpansionCount: 0.5
  })
});

const zeroPips = () => ({ Wood: 0, Brick: 0, Sheep: 0, Wheat: 0, Ore: 0 });

function factsFromNodeSpecs(specs, blockedByNodeId) {
  const nodes = specs.map(({ nodeId, resource, pips }) => ({
    nodeId,
    totalPips: pips,
    resourcePips: { ...zeroPips(), [resource]: pips },
    resources: [resource],
    port: null,
    blockedNodeIds: [...blockedByNodeId[nodeId]].sort((left, right) => left - right)
  }));
  return {
    tiles: [],
    nodes,
    legalPairs: nodes.flatMap((left, leftIndex) => nodes.slice(leftIndex + 1)
      .filter((right) => !left.blockedNodeIds.includes(right.nodeId))
      .map((right) => [left.nodeId, right.nodeId])),
    topology: {
      nodeNeighbors: Object.fromEntries(nodes.map((node) => [
        node.nodeId,
        node.blockedNodeIds.filter((nodeId) => nodeId !== node.nodeId)
      ]))
    },
    validityErrors: [],
    redAdjacencyPairs: []
  };
}

function syntheticDenialFacts() {
  const specs = [
    { nodeId: 1, resource: ResourceType.WOOD, pips: 10 },
    { nodeId: 2, resource: ResourceType.WOOD, pips: 9 },
    { nodeId: 3, resource: ResourceType.WOOD, pips: 8 },
    { nodeId: 4, resource: ResourceType.BRICK, pips: 7 },
    { nodeId: 5, resource: ResourceType.SHEEP, pips: 6 },
    { nodeId: 6, resource: ResourceType.WHEAT, pips: 5 }
  ];
  return factsFromNodeSpecs(specs, Object.fromEntries(specs.map(({ nodeId }) => [nodeId, [nodeId]])));
}

function symmetricTieFacts() {
  const specs = Array.from({ length: 8 }, (_, index) => ({
    nodeId: index + 1,
    resource: ResourceType.WOOD,
    pips: 1
  }));
  const blockedByNodeId = Object.fromEntries(specs.map(({ nodeId }) => {
    const pairedNodeId = nodeId % 2 === 0 ? nodeId - 1 : nodeId + 1;
    return [nodeId, [nodeId, pairedNodeId]];
  }));
  return factsFromNodeSpecs(specs, blockedByNodeId);
}

describe("exact opening draft solver", () => {
  it("chooses a lower raw-production first pick when denial improves P1's final result", () => {
    const facts = syntheticDenialFacts();
    const result = solveOpeningDraft(facts, {
      policy: TEST_POLICY,
      precision: 1e-6
    });
    expect(result.line.map(({ player, nodeId }) => ({ player, nodeId }))).toEqual([
      { player: "P1", nodeId: 4 },
      { player: "P2", nodeId: 1 },
      { player: "P2", nodeId: 2 },
      { player: "P1", nodeId: 3 }
    ]);
    expect(result.p1Portfolio.settlementNodeIds).toEqual([4, 3]);
    expect(result.p2Portfolio.settlementNodeIds).toEqual([1, 2]);
    expect(result.rootOptions).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 1 }),
      expect.objectContaining({ nodeId: 4 })
    ]));
  });

  it("never emits adjacent settlement picks", () => {
    const facts = symmetricTieFacts();
    const result = solveOpeningDraft(facts, { policy: TEST_POLICY, precision: 1e-6 });
    for (const pick of result.line) {
      const node = facts.nodes.find((entry) => entry.nodeId === pick.nodeId);
      const otherIds = result.line.filter((entry) => entry !== pick).map((entry) => entry.nodeId);
      expect(otherIds.some((nodeId) => node.blockedNodeIds.includes(nodeId))).toBe(false);
    }
  });

  it("uses node-id sequence as the final tie breaker", () => {
    const result = solveOpeningDraft(symmetricTieFacts(), { policy: TEST_POLICY, precision: 1e-6 });
    expect(result.line.map((pick) => pick.nodeId)).toEqual([1, 3, 5, 7]);
  });

  it("keeps materialised values aligned with the selected precomputed scalar summary", () => {
    const result = solveOpeningDraft(symmetricTieFacts(), {
      policy: EXPANSION_POLICY,
      precision: 1e-6
    });
    const selectedRoot = result.rootOptions.find(({ nodeId }) => nodeId === result.line[0].nodeId);

    expect(result.p1Value).toBeCloseTo(valueOpeningPortfolio(result.p1Portfolio, EXPANSION_POLICY), 10);
    expect(result.p2Value).toBeCloseTo(valueOpeningPortfolio(result.p2Portfolio, EXPANSION_POLICY), 10);
    expect(selectedRoot.seatAdvantage).toBeCloseTo(result.seatAdvantage, 10);
    expect(selectedRoot.normalisedSeatAdvantage).toBeCloseTo(result.normalisedSeatAdvantage, 10);
  });

  it("retains only the best 32 selected-root response options", () => {
    const specs = Array.from({ length: 10 }, (_, index) => ({
      nodeId: index + 1,
      resource: ResourceType.WOOD,
      pips: 1
    }));
    const facts = factsFromNodeSpecs(
      specs,
      Object.fromEntries(specs.map(({ nodeId }) => [nodeId, [nodeId]]))
    );

    const result = solveOpeningDraft(facts, { policy: TEST_POLICY, precision: 1e-6 });

    expect(result.responseOptions).toHaveLength(32);
    expect(result.responseOptions[0].nodeIds).toEqual([2, 3]);
    expect(result.responseOptions.at(-1).nodeIds).toEqual([5, 10]);
  });
});
