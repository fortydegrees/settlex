import { ResourceType, type Resource, type Cost } from "./types";

export type Ruleset = {
  discardLimit: number;
  friendlyRobber: { enabled: boolean; vpThreshold: number };
  bank: { finite: boolean; resourceCounts: Record<Resource, number> };
  pieceLimits: { roads: number; settlements: number; cities: number };
  buildCosts: { road: Cost; settlement: Cost; city: Cost };
};

export function createStandardRuleset(): Ruleset {
  return {
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
    pieceLimits: {
      roads: 15,
      settlements: 5,
      cities: 4
    },
    buildCosts: {
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
}
