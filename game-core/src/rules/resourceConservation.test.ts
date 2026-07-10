import { describe, expect, it } from "vitest";
import { createEmptyState, type GameState } from "../core/state";
import { buildTopology } from "../core/topology";
import { ResourceType, TileTypes, type Resource } from "../types";
import { applyBuildRoad } from "./buildActions";
import { buyDevCard } from "./devCards";
import { applyDiscard, applyResourceDistribution } from "./turnFlow";
import { applyMaritimeTrade } from "./trading";

const board = buildTopology([
  {
    coordinate: [0, 0, 0] as [number, number, number],
    type: TileTypes.LAND,
    tile: {
      id: 1,
      resource: ResourceType.WOOD,
      number: 8,
      nodes: { NORTH: 1, SOUTH: 2 },
      edges: { EAST: [1, 2] as [number, number] }
    }
  }
]);

function resourceTotals(state: GameState): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const resource of state.bank.resources) {
    totals[resource] = (totals[resource] ?? 0) + 1;
  }
  for (const player of Object.values(state.playerStateById)) {
    for (const resource of player.resources) {
      totals[resource] = (totals[resource] ?? 0) + 1;
    }
  }
  return totals;
}

function moveFromBankToPlayer(
  state: GameState,
  playerId: string,
  resources: Resource[]
) {
  for (const resource of resources) {
    const index = state.bank.resources.indexOf(resource);
    expect(index).toBeGreaterThanOrEqual(0);
    state.bank.resources.splice(index, 1);
    state.playerStateById[playerId].resources.push(resource);
  }
}

describe("finite-bank resource conservation", () => {
  it("conserves resources when discarding", () => {
    const state = createEmptyState(["0"]);
    moveFromBankToPlayer(state, "0", Array(8).fill(ResourceType.WOOD));
    state.turn.phase = "robberDiscard";
    state.turn.pendingDiscards = ["0"];
    const before = resourceTotals(state);

    expect(
      applyDiscard(state, "0", Array(4).fill(ResourceType.WOOD))
    ).toEqual({ ok: true });
    expect(resourceTotals(state)).toEqual(before);
  });

  it("conserves resources when building", () => {
    const state = createEmptyState(["0"]);
    moveFromBankToPlayer(state, "0", [
      ResourceType.WOOD,
      ResourceType.BRICK
    ]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    const before = resourceTotals(state);

    expect(applyBuildRoad(state, board, "1,2", "0").ok).toBe(true);
    expect(resourceTotals(state)).toEqual(before);
  });

  it("conserves resources when buying a development card", () => {
    const state = createEmptyState(["0"]);
    state.devDeck = ["knight"];
    moveFromBankToPlayer(state, "0", [
      ResourceType.SHEEP,
      ResourceType.WHEAT,
      ResourceType.ORE
    ]);
    const before = resourceTotals(state);

    expect(buyDevCard(state, "0").ok).toBe(true);
    expect(resourceTotals(state)).toEqual(before);
  });

  it("conserves resources in a maritime trade", () => {
    const state = createEmptyState(["0"]);
    state.ruleset.tradeRates.bank = 4;
    moveFromBankToPlayer(state, "0", Array(4).fill(ResourceType.WOOD));
    const before = resourceTotals(state);

    expect(
      applyMaritimeTrade(state, board, "0", {
        give: ResourceType.WOOD,
        receive: ResourceType.BRICK
      }).ok
    ).toBe(true);
    expect(resourceTotals(state)).toEqual(before);
  });

  it("conserves resources during production", () => {
    const state = createEmptyState(["0"]);
    state.buildingsByNodeId[1] = { ownerId: "0", type: "settlement" };
    const before = resourceTotals(state);

    expect(applyResourceDistribution(state, board, 8).ok).toBe(true);
    expect(resourceTotals(state)).toEqual(before);
  });
});
