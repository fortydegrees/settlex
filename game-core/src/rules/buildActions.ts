import type { BoardTopology } from "../core/topology";
import type { GameState } from "../core/state";
import type { Cost, Resource } from "../types";
import type { EdgeId, NodeId } from "../core/ids";
import { buildableEdges, buildableNodes } from "./buildability";
import { recomputeCaches } from "./apply";
import { recomputeLongestRoad } from "./victory";

function countResources(resources: Resource[]): Record<Resource, number> {
  const counts: Record<Resource, number> = {} as Record<Resource, number>;
  for (const resource of resources) {
    counts[resource] = (counts[resource] ?? 0) + 1;
  }
  return counts;
}

export function canAfford(cost: Cost, resources: Resource[]): boolean {
  const counts = countResources(resources);
  for (const [resource, amount] of Object.entries(cost)) {
    const required = amount ?? 0;
    if ((counts[resource as Resource] ?? 0) < required) {
      return false;
    }
  }
  return true;
}

function removeCardOnce(cards: Resource[], card: Resource): boolean {
  const index = cards.indexOf(card);
  if (index === -1) {
    return false;
  }
  cards.splice(index, 1);
  return true;
}

export function spendResources(
  cost: Cost,
  playerResources: Resource[],
  bankResources: Resource[],
  finite: boolean
): { ok: true } | { ok: false; error: string } {
  for (const [resource, amount] of Object.entries(cost)) {
    const required = amount ?? 0;
    for (let i = 0; i < required; i += 1) {
      if (!removeCardOnce(playerResources, resource as Resource)) {
        return { ok: false, error: "missing-resource" };
      }
      if (finite) {
        bankResources.push(resource as Resource);
      }
    }
  }
  return { ok: true };
}

function isSpendError(
  result: { ok: true } | { ok: false; error: string }
): result is { ok: false; error: string } {
  return result.ok === false;
}

export function applyBuildRoad(
  state: GameState,
  board: BoardTopology,
  edgeId: EdgeId,
  playerId: string
) {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, state, error: "unknown-player" } as const;
  }
  if (player.roadsRemaining <= 0) {
    return { ok: false, state, error: "no-pieces-left" } as const;
  }
  if (!canAfford(state.ruleset.buildCosts.road, player.resources)) {
    return { ok: false, state, error: "insufficient-resources" } as const;
  }

  const legal = buildableEdges(state, board, playerId, { initialPlacement: false });
  if (!legal.includes(edgeId)) {
    return { ok: false, state, error: "illegal-road" } as const;
  }

  const spent = spendResources(
    state.ruleset.buildCosts.road,
    player.resources,
    state.bank.resources,
    state.ruleset.bank.finite
  );
  if (isSpendError(spent)) {
    return { ok: false, state, error: spent.error } as const;
  }

  state.roadsByEdgeId[edgeId] = playerId;
  player.roadsRemaining -= 1;
  recomputeCaches(state, board);
  recomputeLongestRoad(state, board);
  return { ok: true, state } as const;
}

export function applyBuildSettlement(
  state: GameState,
  board: BoardTopology,
  nodeId: NodeId,
  playerId: string
) {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, state, error: "unknown-player" } as const;
  }
  if (player.settlementsRemaining <= 0) {
    return { ok: false, state, error: "no-pieces-left" } as const;
  }
  if (!canAfford(state.ruleset.buildCosts.settlement, player.resources)) {
    return { ok: false, state, error: "insufficient-resources" } as const;
  }

  const legal = buildableNodes(state, board, playerId, { initialPlacement: false });
  if (!legal.includes(nodeId)) {
    return { ok: false, state, error: "illegal-settlement" } as const;
  }

  const spent = spendResources(
    state.ruleset.buildCosts.settlement,
    player.resources,
    state.bank.resources,
    state.ruleset.bank.finite
  );
  if (isSpendError(spent)) {
    return { ok: false, state, error: spent.error } as const;
  }

  state.buildingsByNodeId[nodeId] = { ownerId: playerId, type: "settlement" };
  player.settlementsRemaining -= 1;
  recomputeCaches(state, board);
  recomputeLongestRoad(state, board);
  return { ok: true, state } as const;
}

export function applyBuildCity(
  state: GameState,
  board: BoardTopology,
  nodeId: NodeId,
  playerId: string
) {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, state, error: "unknown-player" } as const;
  }
  if (player.citiesRemaining <= 0) {
    return { ok: false, state, error: "no-pieces-left" } as const;
  }
  if (!canAfford(state.ruleset.buildCosts.city, player.resources)) {
    return { ok: false, state, error: "insufficient-resources" } as const;
  }

  const building = state.buildingsByNodeId[nodeId];
  if (!building || building.ownerId !== playerId || building.type !== "settlement") {
    return { ok: false, state, error: "illegal-city" } as const;
  }

  const spent = spendResources(
    state.ruleset.buildCosts.city,
    player.resources,
    state.bank.resources,
    state.ruleset.bank.finite
  );
  if (isSpendError(spent)) {
    return { ok: false, state, error: spent.error } as const;
  }

  state.buildingsByNodeId[nodeId] = { ownerId: playerId, type: "city" };
  player.citiesRemaining -= 1;
  player.settlementsRemaining += 1;
  recomputeCaches(state, board);
  recomputeLongestRoad(state, board);
  return { ok: true, state } as const;
}
