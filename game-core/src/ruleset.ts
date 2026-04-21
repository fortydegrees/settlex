import { ResourceType, type Resource, type Cost, type DevCardType } from "./types";

export type Ruleset = {
  victoryPointsToWin: number;
  discardLimit: number;
  friendlyRobber: { enabled: boolean; vpThreshold: number };
  bank: { finite: boolean; resourceCounts: Record<Resource, number> };
  allowPlayerTrades: boolean;
  tradeRates: { bank: number; genericPort: number; specificPort: number };
  devCardsEnabled: boolean;
  devCardCounts: Record<DevCardType, number>;
  longestRoadMinLength: number;
  largestArmyMinKnights: number;
  pieceLimits: { roads: number; settlements: number; cities: number };
  buildCosts: { road: Cost; settlement: Cost; city: Cost; devCard: Cost };
};

export type RulesetId = "standard" | "duel";

export const STANDARD_RULESET: Ruleset = {
  victoryPointsToWin: 10,
  discardLimit: 7,
  friendlyRobber: { enabled: false, vpThreshold: 2 },
  bank: {
    finite: true,
    resourceCounts: {
      [ResourceType.WOOD]: 19,
      [ResourceType.BRICK]: 19,
      [ResourceType.SHEEP]: 19,
      [ResourceType.WHEAT]: 19,
      [ResourceType.ORE]: 19,
      [ResourceType.DESERT]: 0,
      [ResourceType.GOLD]: 0,
      [ResourceType.WATER]: 0,
      [ResourceType.EMPTY]: 0,
      [ResourceType.ANY]: 0
    }
  },
  allowPlayerTrades: true,
  tradeRates: { bank: 4, genericPort: 3, specificPort: 2 },
  devCardsEnabled: true,
  devCardCounts: {
    knight: 14,
    victoryPoint: 5,
    roadBuilding: 2,
    yearOfPlenty: 2,
    monopoly: 2
  },
  longestRoadMinLength: 5,
  largestArmyMinKnights: 3,
  pieceLimits: {
    roads: 15,
    settlements: 5,
    cities: 4
  },
  buildCosts: {
    devCard: {
      [ResourceType.SHEEP]: 1,
      [ResourceType.WHEAT]: 1,
      [ResourceType.ORE]: 1
    },
    road: {
      [ResourceType.WOOD]: 1,
      [ResourceType.BRICK]: 1
    },
    settlement: {
      [ResourceType.WOOD]: 1,
      [ResourceType.BRICK]: 1,
      [ResourceType.SHEEP]: 1,
      [ResourceType.WHEAT]: 1
    },
    city: {
      [ResourceType.WHEAT]: 2,
      [ResourceType.ORE]: 3
    }
  }
};

export const DUEL_RULESET: Ruleset = {
  ...STANDARD_RULESET,
  victoryPointsToWin: 15,
  discardLimit: 9,
  friendlyRobber: { enabled: true, vpThreshold: 2 },
  allowPlayerTrades: false,
  bank: {
    ...STANDARD_RULESET.bank,
    resourceCounts: { ...STANDARD_RULESET.bank.resourceCounts }
  },
  tradeRates: { ...STANDARD_RULESET.tradeRates },
  devCardCounts: { ...STANDARD_RULESET.devCardCounts },
  pieceLimits: { ...STANDARD_RULESET.pieceLimits },
  buildCosts: {
    devCard: { ...STANDARD_RULESET.buildCosts.devCard },
    road: { ...STANDARD_RULESET.buildCosts.road },
    settlement: { ...STANDARD_RULESET.buildCosts.settlement },
    city: { ...STANDARD_RULESET.buildCosts.city }
  }
};

export const RULESETS: Record<RulesetId, Ruleset> = {
  standard: STANDARD_RULESET,
  duel: DUEL_RULESET
};

function cloneRuleset(spec: Ruleset): Ruleset {
  if (typeof structuredClone === "function") {
    return structuredClone(spec) as Ruleset;
  }
  return JSON.parse(JSON.stringify(spec)) as Ruleset;
}

export function createRuleset(spec: Ruleset): Ruleset {
  return cloneRuleset(spec);
}

export function resolveRuleset(id: RulesetId | string): Ruleset {
  const ruleset = RULESETS[id as RulesetId];
  if (!ruleset) {
    throw new Error(`Unknown ruleset: ${id}`);
  }
  return ruleset;
}

export function createStandardRuleset(): Ruleset {
  return createRuleset(STANDARD_RULESET);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateRuleset(
  ruleset: Ruleset
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isFiniteNumber(ruleset.victoryPointsToWin) || ruleset.victoryPointsToWin < 1) {
    errors.push("victoryPointsToWin must be >= 1");
  }
  if (!isFiniteNumber(ruleset.longestRoadMinLength) || ruleset.longestRoadMinLength < 1) {
    errors.push("longestRoadMinLength must be >= 1");
  }
  if (!isFiniteNumber(ruleset.largestArmyMinKnights) || ruleset.largestArmyMinKnights < 1) {
    errors.push("largestArmyMinKnights must be >= 1");
  }
  if (!isFiniteNumber(ruleset.discardLimit) || ruleset.discardLimit < 0) {
    errors.push("discardLimit must be >= 0");
  }

  const tradeRates = ruleset.tradeRates ?? { bank: NaN, genericPort: NaN, specificPort: NaN };
  for (const [key, value] of Object.entries(tradeRates)) {
    if (!isFiniteNumber(value) || value < 1) {
      errors.push(`tradeRates.${key} must be >= 1`);
    }
  }

  const limits = ruleset.pieceLimits ?? { roads: NaN, settlements: NaN, cities: NaN };
  for (const [key, value] of Object.entries(limits)) {
    if (!isFiniteNumber(value) || value < 0) {
      errors.push(`pieceLimits.${key} must be >= 0`);
    }
  }

  const requiredResources = Object.values(ResourceType);
  const counts = ruleset.bank?.resourceCounts ?? {};
  for (const resource of requiredResources) {
    const value = counts[resource as Resource];
    if (!isFiniteNumber(value) || value < 0) {
      errors.push(`bank.resourceCounts.${resource} must be >= 0`);
    }
  }

  const devCardCounts = ruleset.devCardCounts ?? {};
  const devTypes: DevCardType[] = [
    "knight",
    "victoryPoint",
    "roadBuilding",
    "yearOfPlenty",
    "monopoly"
  ];
  for (const card of devTypes) {
    const value = devCardCounts[card];
    if (!isFiniteNumber(value) || value < 0) {
      errors.push(`devCardCounts.${card} must be >= 0`);
    }
  }

  for (const [costKey, cost] of Object.entries(ruleset.buildCosts ?? {})) {
    for (const [resource, amount] of Object.entries(cost)) {
      if (!isFiniteNumber(amount) || amount < 0) {
        errors.push(`buildCosts.${costKey}.${resource} must be >= 0`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
