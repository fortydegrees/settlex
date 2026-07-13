import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import { buildOpeningPortfolio } from "../analysis/openingPortfolio.mjs";
import { DUEL_FAIR_V2_PROFILE } from "../analysis/duelFairV2Profile.mjs";
import { generateCandidate, BOARD_FAMILIES } from "../generators/generateCandidate.mjs";
import {
  hashOpeningProfile,
  valueOpeningPortfolio
} from "../analysis/openingPolicy.mjs";

describe("ordered duel opening portfolios", () => {
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

it("keeps feature identity separate from the profile hash", () => {
  expect(DUEL_FAIR_V2_PROFILE.featureVersion).toBe("duel-opening-features-v1");
  expect(DUEL_FAIR_V2_PROFILE.policyVersion).toBe("duel-fair-v2");
  expect(hashOpeningProfile(DUEL_FAIR_V2_PROFILE)).toMatch(/^[a-f0-9]{64}$/);
});

it("values a viable all-resource portfolio above a dead equal-production portfolio", () => {
  const viable = {
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
