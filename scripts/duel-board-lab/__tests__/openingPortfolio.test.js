import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import {
  buildOpeningPortfolio,
  compileExpansionPaths,
  measureExpansionReach
} from "../analysis/openingPortfolio.mjs";
import { DUEL_FAIR_V2_PROFILE } from "../analysis/duelFairV2Profile.mjs";
import { generateCandidate, BOARD_FAMILIES } from "../generators/generateCandidate.mjs";
import {
  hashOpeningProfile,
  valueOpeningPortfolio
} from "../analysis/openingPolicy.mjs";

const RESOURCE_PIPS = Object.freeze({
  [ResourceType.WOOD]: 0,
  [ResourceType.BRICK]: 0,
  [ResourceType.SHEEP]: 0,
  [ResourceType.WHEAT]: 0,
  [ResourceType.ORE]: 0
});

function makeExpansionFacts(blockedNodeIdsByNode = {}) {
  const nodeNeighbors = [
    [1],
    [0, 2, 3],
    [1, 4],
    [1],
    [2, 5],
    [4, 6, 7],
    [5],
    [5]
  ];
  return {
    tiles: [],
    topology: { nodeNeighbors },
    nodes: nodeNeighbors.map((_, nodeId) => ({
      nodeId,
      blockedNodeIds: blockedNodeIdsByNode[nodeId] ?? [nodeId],
      resourcePips: { ...RESOURCE_PIPS },
      port: null
    }))
  };
}

function makePortFacts(port) {
  const facts = makeExpansionFacts();
  return {
    ...facts,
    nodes: facts.nodes.map((node) => node.nodeId === 0
      ? { ...node, port, resourcePips: { ...RESOURCE_PIPS, [ResourceType.WOOD]: 8 } }
      : node)
  };
}

function expectDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeepFrozen(nested, seen);
}

function makePolicyPortfolio() {
  return {
    totalProductionPips: 22,
    producedResourceCount: 5,
    missingProducedResources: [],
    directRecipeCapacity: { road: 3, settlement: 3, devCard: 3, city: 4 / 3 },
    directRecipeSurplus: { road: 4, settlement: 6, devCard: 3, city: 7 / 3 },
    tradeAdjustedRecipeCapacity: { road: 3, settlement: 3, devCard: 3, city: 4 / 3 },
    startingReadiness: { road: { canBuyNow: true }, settlement: { canBuyNow: false }, devCard: { canBuyNow: false }, city: { canBuyNow: false } },
    ownedPorts: [],
    expansion: { oneRoadNodeIds: [1], twoRoadNodeIds: [2, 3] },
    productionPips: { Wood: 7, Brick: 3, Sheep: 3, Wheat: 5, Ore: 4 }
  };
}

describe("ordered duel opening portfolios", () => {
  it("rejects adjacent opening nodes when compiling expansion paths", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const facts = buildBoardFacts(candidate.tiles);
    const adjacentNodeId = facts.topology.nodeNeighbors[0][0];

    expect(() => compileExpansionPaths(facts, [0, adjacentNodeId]))
      .toThrow("illegal opening pair");
  });

  it("rejects compiled expansion paths for a different ordered pair", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const facts = buildBoardFacts(candidate.tiles);
    const compiled = compileExpansionPaths(facts, [0, 23]);

    expect(() => measureExpansionReach(facts, [23, 0], [0, 23], compiled))
      .toThrow("compiled expansion paths do not match opening pair");
  });

  it("uses only the second node for starting cards", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const facts = buildBoardFacts(candidate.tiles);
    const portfolio = buildOpeningPortfolio(facts, [0, 23], {
      occupiedNodeIds: [0, 6, 44, 23],
      precision: DUEL_FAIR_V2_PROFILE.tradePrecision
    });

    expect(portfolio.productionPips).toEqual({ Wood: 7, Brick: 3, Sheep: 3, Wheat: 5, Ore: 4 });
    expect(portfolio.startingCards).toEqual([
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.WHEAT
    ]);
    expect(portfolio.startingReadiness.road.canBuyNow).toBe(true);
    expect(portfolio.producedResourceCount).toBe(5);
  });

  it("keeps the same production but changes tempo when pair order changes", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const facts = buildBoardFacts(candidate.tiles);
    const forward = buildOpeningPortfolio(facts, [0, 23], { occupiedNodeIds: [0, 23], precision: 1e-6 });
    const reverse = buildOpeningPortfolio(facts, [23, 0], { occupiedNodeIds: [0, 23], precision: 1e-6 });
    expect(reverse.productionPips).toEqual(forward.productionPips);
    expect(reverse.startingCards).not.toEqual(forward.startingCards);
  });
});

describe("compiled expansion paths", () => {
  const orderedNodeIds = [0, 6];

  it("blocks two-road routes whose transit node has an opponent settlement", () => {
    const facts = makeExpansionFacts();

    expect(measureExpansionReach(facts, orderedNodeIds, [0, 1, 6])).toEqual({
      oneRoadNodeIds: [5],
      twoRoadNodeIds: [4, 7]
    });
  });

  it("excludes occupied one-road and two-road endpoints", () => {
    const facts = makeExpansionFacts();

    expect(measureExpansionReach(facts, orderedNodeIds, [0, 5, 6])).toEqual({
      oneRoadNodeIds: [1],
      twoRoadNodeIds: [2, 3]
    });
    expect(measureExpansionReach(facts, orderedNodeIds, [0, 2, 6])).toEqual({
      oneRoadNodeIds: [1, 5],
      twoRoadNodeIds: [3, 4, 7]
    });
  });

  it("excludes two-road destinations blocked by any occupied settlement", () => {
    const facts = makeExpansionFacts({ 4: [2, 4] });

    expect(measureExpansionReach(facts, orderedNodeIds, [0, 4, 6])).toEqual({
      oneRoadNodeIds: [1, 5],
      twoRoadNodeIds: [3, 7]
    });
  });

  it("matches on-demand materialisation when paths are precompiled", () => {
    const facts = makeExpansionFacts({ 4: [2, 4] });
    const compiled = compileExpansionPaths(facts, orderedNodeIds);

    for (const occupiedNodeIds of [[0, 6], [0, 1, 6], [0, 4, 6]]) {
      expect(measureExpansionReach(facts, orderedNodeIds, occupiedNodeIds, compiled))
        .toEqual(measureExpansionReach(facts, orderedNodeIds, occupiedNodeIds));
    }
  });
});

it("applies generic and resource-specific owned-port trade rates", () => {
  const options = { occupiedNodeIds: [0, 6], precision: 1e-6 };
  const generic = buildOpeningPortfolio(makePortFacts(ResourceType.ANY), [0, 6], options);
  const specific = buildOpeningPortfolio(makePortFacts(ResourceType.WOOD), [0, 6], options);

  expect(generic.ownedPorts).toEqual([ResourceType.ANY]);
  expect(generic.tradeAdjustedRecipeCapacity.road).toBeCloseTo(2, 5);
  expect(specific.ownedPorts).toEqual([ResourceType.WOOD]);
  expect(specific.tradeAdjustedRecipeCapacity.road).toBeCloseTo(8 / 3, 5);
});

it("deep-freezes portfolio, compiled-path, and expansion-reach outputs", () => {
  const facts = makeExpansionFacts();
  const compiled = compileExpansionPaths(facts, [0, 6]);
  const reach = measureExpansionReach(facts, [0, 6], [0, 6], compiled);
  const portfolio = buildOpeningPortfolio(makePortFacts(ResourceType.ANY), [0, 6], {
    occupiedNodeIds: [0, 6],
    precision: 1e-6
  });

  expectDeepFrozen(compiled);
  expectDeepFrozen(reach);
  expectDeepFrozen(portfolio);
  expect(typeof compiled.blockedNodeMasks[0]).toBe("bigint");
  expect(typeof compiled.oneRoadPaths[0].destinationMask).toBe("bigint");
  expect(typeof compiled.twoRoadPaths[0].transitMask).toBe("bigint");
});

it("keeps feature identity separate from the profile hash", () => {
  expect(DUEL_FAIR_V2_PROFILE.featureVersion).toBe("duel-opening-features-v1");
  expect(DUEL_FAIR_V2_PROFILE.policyVersion).toBe("duel-fair-v2");
  expect(hashOpeningProfile(DUEL_FAIR_V2_PROFILE)).toMatch(/^[a-f0-9]{64}$/);
});

it("values a viable all-resource portfolio above a dead equal-production portfolio", () => {
  const viable = makePolicyPortfolio();
  const dead = {
    ...viable,
    totalProductionPips: 23,
    producedResourceCount: 3,
    missingProducedResources: [ResourceType.WOOD, ResourceType.ORE],
    directRecipeCapacity: { road: 0, settlement: 0, devCard: 0, city: 0 },
    directRecipeSurplus: { road: 8, settlement: 23, devCard: 15, city: 8 },
    tradeAdjustedRecipeCapacity: { road: 1, settlement: 1, devCard: 1, city: 1 },
    startingReadiness: { road: { canBuyNow: false }, settlement: { canBuyNow: false }, devCard: { canBuyNow: false }, city: { canBuyNow: false } },
    productionPips: { Wood: 0, Brick: 8, Sheep: 7, Wheat: 8, Ore: 0 }
  };
  expect(valueOpeningPortfolio(viable, DUEL_FAIR_V2_PROFILE.officialPolicy))
    .toBeGreaterThan(valueOpeningPortfolio(dead, DUEL_FAIR_V2_PROFILE.officialPolicy));
});

it("rejects missing and extra policy weights", () => {
  const portfolio = makePolicyPortfolio();
  const missingWeights = { ...DUEL_FAIR_V2_PROFILE.officialPolicy.weights };
  delete missingWeights.totalProductionPips;
  const extraWeights = {
    ...DUEL_FAIR_V2_PROFILE.officialPolicy.weights,
    unexpectedFeature: 0
  };

  expect(() => valueOpeningPortfolio(portfolio, { weights: missingWeights }))
    .toThrow("policy weights must exactly match opening features");
  expect(() => valueOpeningPortfolio(portfolio, { weights: extraWeights }))
    .toThrow("policy weights must exactly match opening features");
});

it.each([NaN, Infinity, -Infinity])("rejects the non-finite policy weight %s", (weight) => {
  const weights = {
    ...DUEL_FAIR_V2_PROFILE.officialPolicy.weights,
    totalProductionPips: weight
  };

  expect(() => valueOpeningPortfolio(makePolicyPortfolio(), { weights }))
    .toThrow("policy weight must be finite: totalProductionPips");
});
