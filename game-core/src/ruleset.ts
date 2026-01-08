import { ResourceType, type Resource } from "./types";

export type Ruleset = {
  discardLimit: number;
  friendlyRobber: { enabled: boolean; vpThreshold: number };
  bank: { finite: boolean; resourceCounts: Record<Resource, number> };
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
    }
  };
}
