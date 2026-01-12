import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import { getMaritimeTradeRateIfTradable } from "../utils/trade";

describe("getMaritimeTradeRateIfTradable", () => {
  it("returns the best trade rate when the player has enough resources", () => {
    const core = {
      ruleset: { tradeRates: { bank: 4, genericPort: 3, specificPort: 2 } },
      buildingsByNodeId: { 1: { ownerId: "p1" } }
    };
    const coreTopology = { portsByNodeId: { "1": ResourceType.BRICK } };
    const playerResources = [ResourceType.BRICK, ResourceType.BRICK];

    const rate = getMaritimeTradeRateIfTradable({
      core,
      coreTopology,
      playerId: "p1",
      resource: ResourceType.BRICK,
      playerResources
    });

    expect(rate).toBe(2);
  });

  it("returns null when the player lacks resources", () => {
    const core = {
      ruleset: { tradeRates: { bank: 4, genericPort: 3, specificPort: 2 } },
      buildingsByNodeId: { 1: { ownerId: "p1" } }
    };
    const coreTopology = { portsByNodeId: { "1": ResourceType.BRICK } };
    const playerResources = [ResourceType.BRICK];

    const rate = getMaritimeTradeRateIfTradable({
      core,
      coreTopology,
      playerId: "p1",
      resource: ResourceType.BRICK,
      playerResources
    });

    expect(rate).toBeNull();
  });
});
