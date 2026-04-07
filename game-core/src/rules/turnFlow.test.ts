import { describe, it, expect } from "vitest";
import { TileTypes, ResourceType } from "../types";
import { buildTopology } from "../core/topology";
import { createEmptyState } from "../core/state";
import { playersNeedingDiscard, applyDiscard } from "./turnFlow";

const tiles = [
  {
    coordinate: [0, 0, 0] as [number, number, number],
    type: TileTypes.LAND,
    tile: {
      id: 1,
      resource: ResourceType.WOOD,
      number: 8,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: {}
    }
  }
];

const board = buildTopology(tiles);

describe("turnFlow - discard", () => {
  it("flags players over discard limit", () => {
    const state = createEmptyState(["0", "1"]);
    state.ruleset.discardLimit = 7;
    state.playerStateById["0"].resources = Array(8).fill(ResourceType.WOOD);
    state.playerStateById["1"].resources = Array(7).fill(ResourceType.WOOD);

    expect(playersNeedingDiscard(state)).toEqual(["0"]);
  });

  it("applyDiscard removes cards and advances phase when all done", () => {
    const state = createEmptyState(["0", "1"]);
    state.ruleset.discardLimit = 7;
    state.turn.phase = "robberDiscard";
    state.turn.pendingDiscards = ["0"];
    state.playerStateById["0"].resources = Array(8).fill(ResourceType.WOOD);

    const result = applyDiscard(state, "0", Array(4).fill(ResourceType.WOOD));

    expect(result.ok).toBe(true);
    expect(state.playerStateById["0"].resources).toHaveLength(4);
    expect(state.turn.pendingDiscards).toEqual([]);
    expect(state.turn.phase).toBe("robberMove");
  });

  it("rejects discard when player is not pending", () => {
    const state = createEmptyState(["0"]);
    state.turn.phase = "robberDiscard";
    state.turn.pendingDiscards = [];
    state.playerStateById["0"].resources = Array(8).fill(ResourceType.WOOD);

    const result = applyDiscard(state, "0", Array(4).fill(ResourceType.WOOD));
    expect(result).toEqual({ ok: false, error: "discard-not-pending" });
  });

  it("rejects discard with wrong card count", () => {
    const state = createEmptyState(["0"]);
    state.turn.phase = "robberDiscard";
    state.turn.pendingDiscards = ["0"];
    state.playerStateById["0"].resources = Array(8).fill(ResourceType.WOOD);

    const result = applyDiscard(state, "0", Array(3).fill(ResourceType.WOOD));
    expect(result).toEqual({ ok: false, error: "invalid-discard-count" });
  });

  it("rejects discard when a listed resource is missing", () => {
    const state = createEmptyState(["0"]);
    state.turn.phase = "robberDiscard";
    state.turn.pendingDiscards = ["0"];
    state.playerStateById["0"].resources = [
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.WOOD
    ];

    const result = applyDiscard(state, "0", [
      ResourceType.WOOD,
      ResourceType.WOOD,
      ResourceType.BRICK,
      ResourceType.WOOD
    ]);
    expect(result).toEqual({ ok: false, error: "missing-resource" });
  });

  it("rejects discard for unknown pending player", () => {
    const state = createEmptyState(["0"]);
    state.turn.phase = "robberDiscard";
    state.turn.pendingDiscards = ["2"];

    const result = applyDiscard(state, "2", []);
    expect(result).toEqual({ ok: false, error: "unknown-player" });
  });

  it("allows pending players to discard in any order", () => {
    const state = createEmptyState(["0", "1", "2"]);
    state.turn.phase = "robberDiscard";
    state.turn.pendingDiscards = ["0", "2"];
    state.playerStateById["0"].resources = Array(8).fill(ResourceType.WOOD);
    state.playerStateById["2"].resources = Array(8).fill(ResourceType.BRICK);

    const first = applyDiscard(state, "2", Array(4).fill(ResourceType.BRICK));

    expect(first).toEqual({ ok: true });
    expect(state.turn.pendingDiscards).toEqual(["0"]);
    expect(state.turn.phase).toBe("robberDiscard");

    const second = applyDiscard(state, "0", Array(4).fill(ResourceType.WOOD));

    expect(second).toEqual({ ok: true });
    expect(state.turn.pendingDiscards).toEqual([]);
    expect(state.turn.phase).toBe("robberMove");
  });
});

import { applyResourceDistribution } from "./turnFlow";

it("distributes resources for matching roll when bank has enough", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = [ResourceType.WOOD, ResourceType.WOOD];
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.WOOD]);
  expect(state.bank.resources).toHaveLength(1);
});

it("returns distributions array with tileId, playerId, resource", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = [ResourceType.WOOD, ResourceType.WOOD];
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.distributions).toEqual([
      { tileId: 1, playerId: "0", resource: ResourceType.WOOD }
    ]);
  }
});

it("returns 2 distributions for a city", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = Array(5).fill(ResourceType.WOOD);
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "city" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.distributions).toHaveLength(2);
    expect(result.distributions).toEqual([
      { tileId: 1, playerId: "0", resource: ResourceType.WOOD },
      { tileId: 1, playerId: "0", resource: ResourceType.WOOD },
    ]);
  }
});

it("returns blocked tile when robber prevents distribution", () => {
  const state = createEmptyState(["0"]);
  state.bank.resources = Array(5).fill(ResourceType.WOOD);
  state.robberTileId = 1; // Robber on the wood tile
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.distributions).toEqual([]);
    expect(result.blockedTiles).toEqual([1]);
  }
});

it("gives none if bank lacks enough of a resource", () => {
  const state = createEmptyState(["0", "1"]);
  state.bank.resources = [ResourceType.WOOD];
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  state.buildingsByNodeId[2] = { ownerId: "1", type: "settlement" };

  const result = applyResourceDistribution(state, board, 8);

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([]);
  expect(state.playerStateById["1"].resources).toEqual([]);
  expect(state.bank.resources).toHaveLength(1);
  if (result.ok) {
    expect(result.shortages).toContainEqual({
      resource: ResourceType.WOOD,
      required: 2,
      available: 1,
      entitledByPlayerId: { "0": 1, "1": 1 },
      allocatedByPlayerId: {}
    });
  }
});

it("gives all available cards when only one player is entitled to a short resource", () => {
  const wheatTiles = [
    {
      coordinate: [0, 0, 0] as [number, number, number],
      type: TileTypes.LAND,
      tile: {
        id: 20,
        resource: ResourceType.WHEAT,
        number: 8,
        nodes: { NORTH: 1 },
        edges: {}
      }
    }
  ];
  const wheatBoard = buildTopology(wheatTiles);
  const state = createEmptyState(["0"]);
  state.ruleset.bank.finite = true;
  state.bank.resources = [ResourceType.WHEAT];
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "city" };

  const result = applyResourceDistribution(state, wheatBoard, 8);

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.WHEAT]);
  expect(state.bank.resources).toEqual([]);
  if (result.ok) {
    expect(result.distributions).toEqual([
      { tileId: 20, playerId: "0", resource: ResourceType.WHEAT }
    ]);
    expect(result.shortages).toContainEqual({
      resource: ResourceType.WHEAT,
      required: 2,
      available: 1,
      entitledByPlayerId: { "0": 2 },
      allocatedByPlayerId: { "0": 1 }
    });
  }
});

it("still distributes other resources when one resource type is short in bank", () => {
  const mixedTiles = [
    {
      coordinate: [0, 0, 0] as [number, number, number],
      type: TileTypes.LAND,
      tile: {
        id: 10,
        resource: ResourceType.WOOD,
        number: 8,
        nodes: { NORTH: 1 },
        edges: {}
      }
    },
    {
      coordinate: [1, -1, 0] as [number, number, number],
      type: TileTypes.LAND,
      tile: {
        id: 11,
        resource: ResourceType.BRICK,
        number: 8,
        nodes: { NORTH: 2 },
        edges: {}
      }
    }
  ];
  const mixedBoard = buildTopology(mixedTiles);
  const state = createEmptyState(["0"]);
  state.bank.resources = [ResourceType.BRICK];
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
  state.buildingsByNodeId[2] = { ownerId: "0", type: "settlement" };

  const result = applyResourceDistribution(state, mixedBoard, 8);

  expect(result.ok).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.BRICK]);
  expect(state.bank.resources).toEqual([]);
});

import { canPlaceRobber, applyMoveRobber, getRobberVictims } from "./turnFlow";

it("blocks robber placement on tiles adjacent to players <= vp threshold", () => {
  const state = createEmptyState(["0"]);
  state.ruleset.friendlyRobber.enabled = true;
  state.ruleset.friendlyRobber.vpThreshold = 2;
  state.playerStateById["0"].victoryPoints = 2;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  expect(canPlaceRobber(state, board, 1)).toBe(false);
});

it("rejects robber placement on non-land tiles", () => {
  const portTiles = [
    {
      coordinate: [0, 0, 0] as [number, number, number],
      type: TileTypes.PORT,
      tile: {
        id: 2,
        resource: ResourceType.BRICK,
        nodes: { NORTH: 1, SOUTH: 2 },
        edges: {}
      }
    }
  ];
  const portBoard = buildTopology(portTiles);
  const state = createEmptyState(["0"]);

  expect(canPlaceRobber(state, portBoard, 2)).toBe(false);
});

it("rejects robber placement on the current tile", () => {
  const state = createEmptyState(["0"]);
  state.robberTileId = 1;

  expect(canPlaceRobber(state, board, 1)).toBe(false);

  const result = applyMoveRobber(state, board, 1, "0");

  expect(result).toEqual({ ok: false, error: "illegal-robber" });
  expect(state.robberTileId).toBe(1);
});

it("returns eligible victims on robber tile", () => {
  const state = createEmptyState(["0", "1"]);
  state.buildingsByNodeId[1] = { ownerId: "1", type: "settlement" };

  const victims = getRobberVictims(state, board, 1, "0");
  expect(victims).toEqual(["1"]);
});

it("does not move robber when victim selection is ambiguous", () => {
  const state = createEmptyState(["0", "1", "2"]);
  state.buildingsByNodeId[1] = { ownerId: "1", type: "settlement" };
  state.buildingsByNodeId[2] = { ownerId: "2", type: "settlement" };
  state.playerStateById["1"].resources = [ResourceType.WOOD];
  state.playerStateById["2"].resources = [ResourceType.BRICK];

  const result = applyMoveRobber(state, board, 1, "0");

  expect(result.ok).toBe(false);
  expect(state.robberTileId).toBe(null);
});

it("rejects robber move when target victim is invalid", () => {
  const state = createEmptyState(["0", "1", "2"]);
  state.buildingsByNodeId[1] = { ownerId: "1", type: "settlement" };
  state.buildingsByNodeId[2] = { ownerId: "2", type: "settlement" };
  state.playerStateById["1"].resources = [ResourceType.WOOD];
  state.playerStateById["2"].resources = [ResourceType.BRICK];

  const result = applyMoveRobber(state, board, 1, "0", 0.2, "9");
  expect(result).toEqual({ ok: false, error: "invalid-victim" });
});

it("rejects robber move on illegal tiles", () => {
  const portTiles = [
    {
      coordinate: [0, 0, 0] as [number, number, number],
      type: TileTypes.PORT,
      tile: {
        id: 2,
        resource: ResourceType.BRICK,
        nodes: { NORTH: 1, SOUTH: 2 },
        edges: {}
      }
    }
  ];
  const portBoard = buildTopology(portTiles);
  const state = createEmptyState(["0"]);

  const result = applyMoveRobber(state, portBoard, 2, "0");
  expect(result).toEqual({ ok: false, error: "illegal-robber" });
});

it("applyMoveRobber updates tile when legal", () => {
  const state = createEmptyState(["0", "1"]);
  const result = applyMoveRobber(state, board, 1, "0");
  expect(result.ok).toBe(true);
  expect(state.robberTileId).toBe(1);
});

import { applyRollDice } from "./turnFlow";

it("sets postRoll and distributes on non-7", () => {
  const state = createEmptyState(["0"]);
  state.turn.phase = "preRoll";
  state.bank.resources = [ResourceType.WOOD];
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyRollDice(state, board, 8);

  expect(result.ok).toBe(true);
  expect(state.turn.phase).toBe("postRoll");
  expect(state.turn.hasRolled).toBe(true);
  expect(state.playerStateById["0"].resources).toEqual([ResourceType.WOOD]);
});

it("enters robberDiscard on 7 and tracks pending discards", () => {
  const state = createEmptyState(["0"]);
  state.turn.phase = "preRoll";
  state.playerStateById["0"].resources = Array(8).fill(ResourceType.WOOD);
  state.ruleset.discardLimit = 7;

  const result = applyRollDice(state, board, 7);

  expect(result.ok).toBe(true);
  expect(state.turn.phase).toBe("robberDiscard");
  expect(state.turn.pendingDiscards).toEqual(["0"]);
});

import { applyEndTurn } from "./turnFlow";

it("advances the current player and resets turn state", () => {
  const state = createEmptyState(["0", "1"]);
  state.phase = "normal";
  state.turn.currentPlayerId = "0";
  state.turn.phase = "postRoll";
  state.turn.hasRolled = true;
  state.turn.lastRollTotal = 9;
  state.turn.pendingDiscards = [];
  state.playerStateById["0"].devCardsBoughtThisTurn = ["knight"];
  state.playerStateById["0"].devCardsPlayedThisTurn = 1;

  const result = applyEndTurn(state);

  expect(result.ok).toBe(true);
  expect(state.turn.currentPlayerId).toBe("1");
  expect(state.turn.phase).toBe("preRoll");
  expect(state.turn.hasRolled).toBe(false);
  expect(state.turn.lastRollTotal).toBeNull();
  expect(state.turn.pendingDiscards).toEqual([]);
  expect(state.playerStateById["0"].devCardsBoughtThisTurn).toEqual([]);
  expect(state.playerStateById["0"].devCardsPlayedThisTurn).toBe(0);
});

it("wraps to the first player when ending the last player's turn", () => {
  const state = createEmptyState(["0", "1"]);
  state.phase = "normal";
  state.turn.currentPlayerId = "1";
  state.turn.phase = "postRoll";
  state.turn.hasRolled = true;

  const result = applyEndTurn(state);

  expect(result.ok).toBe(true);
  expect(state.turn.currentPlayerId).toBe("0");
});

it("rejects end turn before rolling", () => {
  const state = createEmptyState(["0"]);
  state.phase = "normal";
  state.turn.phase = "preRoll";
  state.turn.hasRolled = false;

  const result = applyEndTurn(state);

  expect(result.ok).toBe(false);
});

it("rejects end turn when robber flow is active", () => {
  const state = createEmptyState(["0"]);
  state.phase = "normal";
  state.turn.phase = "robberMove";
  state.turn.hasRolled = true;

  const result = applyEndTurn(state);

  expect(result.ok).toBe(false);
});

it("rejects end turn when discards are pending", () => {
  const state = createEmptyState(["0"]);
  state.phase = "normal";
  state.turn.phase = "postRoll";
  state.turn.hasRolled = true;
  state.turn.pendingDiscards = ["0"];

  const result = applyEndTurn(state);

  expect(result.ok).toBe(false);
});

it("applyRollDice returns distributions from applyResourceDistribution", () => {
  const state = createEmptyState(["0"]);
  state.phase = "normal";
  state.turn.phase = "preRoll";
  state.bank.resources = Array(5).fill(ResourceType.WOOD);
  state.robberTileId = null;
  state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };

  const result = applyRollDice(state, board, 8);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.distributions).toEqual([
      { tileId: 1, playerId: "0", resource: ResourceType.WOOD }
    ]);
  }
});
