import { describe, it, expect } from "vitest";
import { createEmptyState } from "../core/state";
import { buildTopology } from "../core/topology";
import { ResourceType, TileTypes } from "../types";
import {
  applyMaritimeTrade,
  applyMaritimeTradeBatch,
  applyPlayerTrade,
  bestTradeRate,
  canMaritimeTrade,
  canUsePort,
  getMaritimeTradeReceiveCount
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

  it("counts mixed maritime give selections using each resource's own rate", () => {
    const state = createEmptyState(["0"]);
    state.ruleset.tradeRates.bank = 4;
    state.playerStateById["0"].resources = [
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.WHEAT
    ];

    expect(
      getMaritimeTradeReceiveCount(state, board, "0", [
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.WHEAT,
        ResourceType.WHEAT,
        ResourceType.WHEAT,
        ResourceType.WHEAT
      ])
    ).toEqual({ ok: true, count: 3 });
  });

  it("rejects mixed maritime give selections that leave an incomplete trade chunk", () => {
    const state = createEmptyState(["0"]);
    state.ruleset.tradeRates.bank = 4;
    state.playerStateById["0"].resources = [
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE
    ];

    expect(
      getMaritimeTradeReceiveCount(state, board, "0", [
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE
      ])
    ).toEqual({ ok: false, error: "invalid-trade-ratio" });
  });

  it("applies mixed maritime trades atomically", () => {
    const state = createEmptyState(["0"]);
    state.ruleset.tradeRates.bank = 4;
    state.ruleset.bank.finite = true;
    state.playerStateById["0"].resources = [
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.WHEAT
    ];
    state.bank.resources = [
      ResourceType.BRICK,
      ResourceType.WOOD,
      ResourceType.SHEEP
    ];

    const result = applyMaritimeTradeBatch(state, board, "0", {
      give: [
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.WHEAT,
        ResourceType.WHEAT,
        ResourceType.WHEAT,
        ResourceType.WHEAT
      ],
      receive: [
        ResourceType.BRICK,
        ResourceType.WOOD,
        ResourceType.SHEEP
      ]
    });

    expect(result).toEqual({ ok: true });
    expect(state.playerStateById["0"].resources).toEqual([
      ResourceType.BRICK,
      ResourceType.WOOD,
      ResourceType.SHEEP
    ]);
    expect(state.bank.resources).toEqual([
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.WHEAT
    ]);
  });

  it("rejects mixed maritime trades when receive count does not match trade count", () => {
    const state = createEmptyState(["0"]);
    state.ruleset.tradeRates.bank = 4;
    state.playerStateById["0"].resources = [
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.ORE,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.WHEAT,
      ResourceType.WHEAT
    ];

    const result = applyMaritimeTradeBatch(state, board, "0", {
      give: [
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.ORE,
        ResourceType.WHEAT,
        ResourceType.WHEAT,
        ResourceType.WHEAT,
        ResourceType.WHEAT
      ],
      receive: [ResourceType.BRICK]
    });

    expect(result).toEqual({ ok: false, error: "invalid-receive-count" });
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

  it("applies player trades by swapping the offered resources", () => {
    const state = createEmptyState(["0", "1"]);
    state.playerStateById["0"].resources = [
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.SHEEP
    ];
    state.playerStateById["1"].resources = [
      ResourceType.BRICK,
      ResourceType.WHEAT,
      ResourceType.ORE
    ];

    const result = applyPlayerTrade(state, "0", "1", {
      give: [ResourceType.WOOD, ResourceType.SHEEP],
      receive: [ResourceType.BRICK, ResourceType.ORE]
    });

    expect(result).toEqual({ ok: true });
    expect(state.playerStateById["0"].resources).toEqual([
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.ORE
    ]);
    expect(state.playerStateById["1"].resources).toEqual([
      ResourceType.WHEAT,
      ResourceType.WOOD,
      ResourceType.SHEEP
    ]);
  });
});
