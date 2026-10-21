import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import { startingResourcesForNode } from "../analysis/startingResources.mjs";
import { generateCandidate, BOARD_FAMILIES } from "../generators/generateCandidate.mjs";
import {
  directRecipeCapacities,
  directRecipeSurpluses,
  tradeAdjustedRecipeCapacities
} from "../analysis/recipeCapacity.mjs";

describe("duel opening feature primitives", () => {
  it("returns the exact seed-47 second-settlement cards", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const facts = buildBoardFacts(candidate.tiles);
    expect(startingResourcesForNode(facts, 23)).toEqual([
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.WHEAT
    ]);
  });

  it("preserves duplicate adjacent resources as duplicate cards", () => {
    const facts = {
      tiles: [
        { type: "Land", tile: { id: 1, resource: ResourceType.WOOD, nodes: { A: 4 } } },
        { type: "Land", tile: { id: 2, resource: ResourceType.WOOD, nodes: { A: 4 } } },
        { type: "Land", tile: { id: 3, resource: ResourceType.DESERT, nodes: { A: 4 } } }
      ]
    };
    expect(startingResourcesForNode(facts, 4)).toEqual([ResourceType.WOOD, ResourceType.WOOD]);
  });
});

it("makes missing complementary production a zero direct capacity", () => {
  const pips = { Wood: 8, Brick: 0, Sheep: 7, Wheat: 8, Ore: 0 };
  expect(directRecipeCapacities(pips)).toEqual({
    road: 0,
    settlement: 0,
    devCard: 0,
    city: 0
  });
});

it("normalises city capacity by the two-wheat three-ore cost", () => {
  const pips = { Wood: 0, Brick: 0, Sheep: 0, Wheat: 8, Ore: 9 };
  expect(directRecipeCapacities(pips).city).toBe(3);
});

it("keeps non-bottleneck recipe surplus separate from direct capacity", () => {
  const pips = { Wood: 8, Brick: 0, Sheep: 0, Wheat: 0, Ore: 0 };
  expect(directRecipeCapacities(pips).road).toBe(0);
  expect(directRecipeSurpluses(pips).road).toBe(8);
});

it("uses owned ports without hiding direct capacity", () => {
  const pips = { Wood: 8, Brick: 0, Sheep: 0, Wheat: 0, Ore: 0 };
  expect(tradeAdjustedRecipeCapacities(pips, [], { precision: 1e-6 }).road).toBeCloseTo(1.6, 5);
  expect(tradeAdjustedRecipeCapacities(pips, [ResourceType.WOOD], { precision: 1e-6 }).road)
    .toBeCloseTo(8 / 3, 5);
  expect(directRecipeCapacities(pips).road).toBe(0);
});
