import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";
import { buildTopology } from "../core/topology";
import { ResourceType, TileTypes } from "../types";
import {
  applyMaritimeTrade,
  applyPlayerTrade,
  bestTradeRate,
  canMaritimeTrade,
  canUsePort
} from "./trading";

const tiles = [
  {
    coordinate: [0, 0, 0] as [number, number, number],
    type: TileTypes.PORT,
    tile: {
      id: 1,
      resource: ResourceType.WOOD,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: {}
    }
  }
];

const board = buildTopology(tiles);

describe("trading", () => {
  it("detects port eligibility from player buildings", () => {
    const state = createEmptyState(["0"]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

    expect(canUsePort(state, board, "0", ResourceType.WOOD)).toBe(true);
  });

  it("applies 2:1 trade when specific port owned", () => {
    const state = createEmptyState(["0"]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    state.playerStateById["0"].resources = [
      ResourceType.WOOD,
      ResourceType.WOOD
    ];

    const result = applyMaritimeTrade(state, board, "0", {
      give: ResourceType.WOOD,
      receive: ResourceType.BRICK
    });

    expect(result.ok).toBe(true);
    expect(state.playerStateById["0"].resources).toEqual([ResourceType.BRICK]);
  });

  it("rejects bank trade when player lacks resources", () => {
    const state = createEmptyState(["0"]);

    const result = applyMaritimeTrade(state, board, "0", {
      give: ResourceType.WOOD,
      receive: ResourceType.BRICK
    });

    expect(result.ok).toBe(false);
  });

  it("computes best trade rate from specific port to bank fallback", () => {
    const state = createEmptyState(["0"]);
    state.ruleset.tradeRates.specificPort = 2;
    state.ruleset.tradeRates.genericPort = 3;
    state.ruleset.tradeRates.bank = 4;

    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    expect(bestTradeRate(state, board, "0", ResourceType.WOOD)).toBe(2);
    expect(bestTradeRate(state, board, "0", ResourceType.BRICK)).toBe(4);
  });

  it("returns tradable when player meets at least one best rate", () => {
    const state = createEmptyState(["0"]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    state.playerStateById["0"].resources = [ResourceType.WOOD, ResourceType.WOOD];

    expect(canMaritimeTrade(state, board, "0")).toEqual({ ok: true });
  });

  it("rejects maritime trade when bank is empty for requested resource", () => {
    const state = createEmptyState(["0"]);
    state.ruleset.bank.finite = true;
    state.bank.resources = [ResourceType.WOOD, ResourceType.WOOD];
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    state.playerStateById["0"].resources = [ResourceType.WOOD, ResourceType.WOOD];

    const result = applyMaritimeTrade(state, board, "0", {
      give: ResourceType.WOOD,
      receive: ResourceType.BRICK
    });

    expect(result).toEqual({ ok: false, error: "bank-empty" });
  });

  it("rejects player trade when ruleset disallows it", () => {
    const state = createEmptyState(["0", "1"]);
    state.ruleset.allowPlayerTrades = false;

    const result = applyPlayerTrade(state, "0", "1", {
      give: [ResourceType.WOOD],
      receive: [ResourceType.BRICK]
    });

    expect(result.ok).toBe(false);
  });

  it("rejects player trade when either player is unknown", () => {
    const state = createEmptyState(["0", "1"]);

    const result = applyPlayerTrade(state, "0", "3", {
      give: [ResourceType.WOOD],
      receive: [ResourceType.BRICK]
    });

    expect(result).toEqual({ ok: false, error: "unknown-player" });
  });

  it("rejects player trade when offerer lacks resources", () => {
    const state = createEmptyState(["0", "1"]);
    state.playerStateById["0"].resources = [];
    state.playerStateById["1"].resources = [ResourceType.BRICK];

    const result = applyPlayerTrade(state, "0", "1", {
      give: [ResourceType.WOOD],
      receive: [ResourceType.BRICK]
    });

    expect(result).toEqual({ ok: false, error: "insufficient-resources" });
  });

  it("rejects player trade when receiver lacks requested resources", () => {
    const state = createEmptyState(["0", "1"]);
    state.playerStateById["0"].resources = [ResourceType.WOOD];
    state.playerStateById["1"].resources = [];

    const result = applyPlayerTrade(state, "0", "1", {
      give: [ResourceType.WOOD],
      receive: [ResourceType.BRICK]
    });

    expect(result).toEqual({ ok: false, error: "insufficient-resources" });
  });
});
