import { ResourceType } from "@settlex/game-core";
import { STANDARD_RESOURCES } from "../constants.mjs";

export const DIRECT_RECIPES = Object.freeze({
  road: Object.freeze({ [ResourceType.WOOD]: 1, [ResourceType.BRICK]: 1 }),
  settlement: Object.freeze({
    [ResourceType.WOOD]: 1,
    [ResourceType.BRICK]: 1,
    [ResourceType.SHEEP]: 1,
    [ResourceType.WHEAT]: 1
  }),
  devCard: Object.freeze({
    [ResourceType.SHEEP]: 1,
    [ResourceType.WHEAT]: 1,
    [ResourceType.ORE]: 1
  }),
  city: Object.freeze({ [ResourceType.WHEAT]: 2, [ResourceType.ORE]: 3 })
});

export function directRecipeCapacities(productionPips) {
  return Object.fromEntries(Object.entries(DIRECT_RECIPES).map(([name, cost]) => [
    name,
    Math.min(...Object.entries(cost).map(([resource, amount]) =>
      (productionPips[resource] ?? 0) / amount))
  ]));
}

export function directRecipeSurpluses(productionPips) {
  const capacities = directRecipeCapacities(productionPips);
  return Object.fromEntries(Object.entries(DIRECT_RECIPES).map(([name, cost]) => [
    name,
    Object.entries(cost).reduce((sum, [resource, amount]) => (
      sum + Math.max((productionPips[resource] ?? 0) - capacities[name] * amount, 0)
    ), 0)
  ]));
}

function tradeRate(resource, ports) {
  if (ports.includes(resource)) return 2;
  if (ports.includes(ResourceType.ANY)) return 3;
  return 4;
}

function feasibleCapacity(productionPips, recipe, ports, capacity) {
  let exports = 0;
  let deficits = 0;
  for (const resource of STANDARD_RESOURCES) {
    const balance = (productionPips[resource] ?? 0) - capacity * (recipe[resource] ?? 0);
    if (balance >= 0) exports += balance / tradeRate(resource, ports);
    else deficits += -balance;
  }
  return exports >= deficits;
}

function tradeAdjustedCapacity(productionPips, recipe, ports, precision) {
  const total = Object.values(productionPips).reduce((sum, value) => sum + value, 0);
  const recipeCards = Object.values(recipe).reduce((sum, value) => sum + value, 0);
  let low = 0;
  let high = recipeCards === 0 ? 0 : total / recipeCards;
  while (high - low > precision) {
    const middle = (low + high) / 2;
    if (feasibleCapacity(productionPips, recipe, ports, middle)) low = middle;
    else high = middle;
  }
  return low;
}

export function tradeAdjustedRecipeCapacities(productionPips, ports, { precision }) {
  if (!Number.isFinite(precision) || precision <= 0) throw new Error("precision must be positive");
  return Object.fromEntries(Object.entries(DIRECT_RECIPES).map(([name, recipe]) => [
    name,
    tradeAdjustedCapacity(productionPips, recipe, ports, precision)
  ]));
}
