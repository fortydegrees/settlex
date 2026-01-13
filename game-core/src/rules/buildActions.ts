import type { BoardTopology } from "../core/topology";
import type { GameState } from "../core/state";
import type { Cost, Resource } from "../types";
import type { EdgeId, NodeId } from "../core/ids";
import { buildableEdges, buildableNodes } from "./buildability";
import { recomputeCaches } from "./apply";
import { checkAndApplyWin, recomputeLongestRoad } from "./victory";

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

type CanBuildResult = { ok: true } | { ok: false; error: string };

function isCanBuildError(
  result: CanBuildResult
): result is { ok: false; error: string } {
  return !result.ok;
}

/**
 * Check if a player can afford to build a road (has resources and pieces).
 * Does NOT check placement legality - use buildableEdges() for that.
 */
export function canBuildRoad(
  state: GameState,
  playerId: string
): CanBuildResult {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }
  if (player.roadsRemaining <= 0) {
    return { ok: false, error: "no-pieces-left" };
  }
  if (!canAfford(state.ruleset.buildCosts.road, player.resources)) {
    return { ok: false, error: "insufficient-resources" };
  }
  return { ok: true };
}

/**
 * Check if a player can afford to build a settlement (has resources and pieces).
 * Does NOT check placement legality - use buildableNodes() for that.
 */
export function canBuildSettlement(
  state: GameState,
  playerId: string
): CanBuildResult {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }
  if (player.settlementsRemaining <= 0) {
    return { ok: false, error: "no-pieces-left" };
  }
  if (!canAfford(state.ruleset.buildCosts.settlement, player.resources)) {
    return { ok: false, error: "insufficient-resources" };
  }
  return { ok: true };
}

/**
 * Check if a player can afford to build a city (has resources and pieces).
 * Does NOT check if they have a settlement to upgrade - that's placement logic.
 */
export function canBuildCity(
  state: GameState,
  playerId: string
): CanBuildResult {
  const player = state.playerStateById[playerId];
  if (!player) {
    return { ok: false, error: "unknown-player" };
  }
  if (player.citiesRemaining <= 0) {
    return { ok: false, error: "no-pieces-left" };
  }
  if (!canAfford(state.ruleset.buildCosts.city, player.resources)) {
    return { ok: false, error: "insufficient-resources" };
  }
  return { ok: true };
}

export function applyBuildRoad(
  state: GameState,
  board: BoardTopology,
  edgeId: EdgeId,
  playerId: string
) {
  const canBuild = canBuildRoad(state, playerId);
  if (isCanBuildError(canBuild)) {
    return { ok: false, state, error: canBuild.error } as const;
  }

  const legal = buildableEdges(state, board, playerId, { initialPlacement: false });
  if (!legal.includes(edgeId)) {
    return { ok: false, state, error: "illegal-road" } as const;
  }

  const player = state.playerStateById[playerId]!;
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
  checkAndApplyWin(state, playerId);
  return { ok: true, state } as const;
}

export function applyFreeRoad(
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

  const legal = buildableEdges(state, board, playerId, { initialPlacement: false });
  if (!legal.includes(edgeId)) {
    return { ok: false, state, error: "illegal-road" } as const;
  }

  state.roadsByEdgeId[edgeId] = playerId;
  player.roadsRemaining -= 1;
  recomputeCaches(state, board);
  recomputeLongestRoad(state, board);
  checkAndApplyWin(state, playerId);
  return { ok: true, state } as const;
}

export function applyBuildSettlement(
  state: GameState,
  board: BoardTopology,
  nodeId: NodeId,
  playerId: string
) {
  const canBuild = canBuildSettlement(state, playerId);
  if (isCanBuildError(canBuild)) {
    return { ok: false, state, error: canBuild.error } as const;
  }

  const legal = buildableNodes(state, board, playerId, { initialPlacement: false });
  if (!legal.includes(nodeId)) {
    return { ok: false, state, error: "illegal-settlement" } as const;
  }

  const player = state.playerStateById[playerId]!;
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
  checkAndApplyWin(state, playerId);
  return { ok: true, state } as const;
}

export function applyBuildCity(
  state: GameState,
  board: BoardTopology,
  nodeId: NodeId,
  playerId: string
) {
  const canBuild = canBuildCity(state, playerId);
  if (isCanBuildError(canBuild)) {
    return { ok: false, state, error: canBuild.error } as const;
  }

  const building = state.buildingsByNodeId[nodeId];
  if (!building || building.ownerId !== playerId || building.type !== "settlement") {
    return { ok: false, state, error: "illegal-city" } as const;
  }

  const player = state.playerStateById[playerId]!;
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
  checkAndApplyWin(state, playerId);
  return { ok: true, state } as const;
}
