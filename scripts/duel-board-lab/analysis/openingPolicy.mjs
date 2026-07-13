import { createHash } from "node:crypto";

export function flattenPolicyFeatures(portfolio) {
  const productionValues = Object.values(portfolio.productionPips);
  const concentration = portfolio.totalProductionPips === 0
    ? 0
    : Math.max(...productionValues) / portfolio.totalProductionPips;

  return Object.freeze({
    totalProductionPips: portfolio.totalProductionPips,
    producedResourceCount: portfolio.producedResourceCount,
    missingProducedResourceCount: portfolio.missingProducedResources.length,
    directRoad: portfolio.directRecipeCapacity.road,
    directSettlement: portfolio.directRecipeCapacity.settlement,
    directDevCard: portfolio.directRecipeCapacity.devCard,
    directCity: portfolio.directRecipeCapacity.city,
    surplusRoad: portfolio.directRecipeSurplus.road,
    surplusSettlement: portfolio.directRecipeSurplus.settlement,
    surplusDevCard: portfolio.directRecipeSurplus.devCard,
    surplusCity: portfolio.directRecipeSurplus.city,
    tradeRoad: portfolio.tradeAdjustedRecipeCapacity.road,
    tradeSettlement: portfolio.tradeAdjustedRecipeCapacity.settlement,
    tradeDevCard: portfolio.tradeAdjustedRecipeCapacity.devCard,
    tradeCity: portfolio.tradeAdjustedRecipeCapacity.city,
    immediateRoad: Number(portfolio.startingReadiness.road.canBuyNow),
    immediateSettlement: Number(portfolio.startingReadiness.settlement.canBuyNow),
    immediateDevCard: Number(portfolio.startingReadiness.devCard.canBuyNow),
    immediateCity: Number(portfolio.startingReadiness.city.canBuyNow),
    ownedPortCount: portfolio.ownedPorts.length,
    oneRoadExpansionCount: portfolio.expansion.oneRoadNodeIds.length,
    twoRoadExpansionCount: portfolio.expansion.twoRoadNodeIds.length,
    productionConcentration: concentration
  });
}

export function valueOpeningPortfolio(portfolio, policy) {
  const features = flattenPolicyFeatures(portfolio);
  const featureKeys = Object.keys(features);
  const weightKeys = Object.keys(policy.weights ?? {});
  if (featureKeys.length !== weightKeys.length || featureKeys.some((key) => !weightKeys.includes(key))) {
    throw new Error("policy weights must exactly match opening features");
  }
  return featureKeys.reduce((value, key) => {
    const weight = policy.weights[key];
    if (!Number.isFinite(weight)) throw new Error(`policy weight must be finite: ${key}`);
    return value + features[key] * weight;
  }, 0);
}

export const hashOpeningProfile = (profile) => createHash("sha256")
  .update(JSON.stringify(profile))
  .digest("hex");
