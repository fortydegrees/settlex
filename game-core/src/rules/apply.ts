import { BoardTopology } from "../core/topology";
import { GameState } from "../core/state";
import { buildableNodes, buildableEdges } from "./buildability";
import { NodeId, EdgeId } from "../core/ids";
import { checkAndApplyWin, recomputeLongestRoad } from "./victory";
import { ResourceType, TileTypes, type Resource } from "../types";
import type { Distribution } from "./turnFlow";

function removeCardOnce(cards: Resource[], card: Resource): boolean {
  const index = cards.indexOf(card);
  if (index === -1) return false;
  cards.splice(index, 1);
  return true;
}

function applyInitialPlacementResources(
  state: GameState,
  board: BoardTopology,
  nodeId: NodeId,
  playerId: string
): Distribution[] {
  const playerState = state.playerStateById[playerId];
  const startingSettlements = state.ruleset.pieceLimits.settlements;
  if (!playerState) return [];
  if (typeof startingSettlements !== "number") return [];

  // Only grant resources on the second placement.
  if (playerState.settlementsRemaining !== startingSettlements - 2) {
    return [];
  }

  let distributions: Distribution[] = [];
  let allocations: Resource[] = [];
  const requiredByResource: Record<string, number> = {};

  for (const tile of board.tiles) {
    if (tile.type !== TileTypes.LAND) continue;
    const resource = tile.tile.resource as Resource | undefined;
    if (!resource) continue;
    if (resource === ResourceType.DESERT || resource === ResourceType.EMPTY) {
      continue;
    }
    const nodes = tile.tile.nodes ?? {};
    const touchesNode = Object.values(nodes).some((id) => id === nodeId);
    if (!touchesNode) continue;

    distributions.push({ tileId: tile.tile.id, playerId, resource });
    allocations.push(resource);
    requiredByResource[resource] = (requiredByResource[resource] ?? 0) + 1;
  }

  if (state.ruleset.bank.finite) {
    for (const [resource, required] of Object.entries(requiredByResource)) {
      const available = state.bank.resources.filter((r) => r === resource).length;
      if (required > available) {
        const resTyped = resource as Resource;
        allocations = allocations.filter((r) => r !== resTyped);
        distributions = distributions.filter((d) => d.resource !== resTyped);
      }
    }
  }

  for (const resource of allocations) {
    playerState.resources.push(resource);
    if (state.ruleset.bank.finite) {
      removeCardOnce(state.bank.resources, resource);
    }
  }

  return distributions;
}

export function recomputeCaches(state: GameState, board: BoardTopology): GameState {
  const isPlacement = state.phase === "placement";
  for (const playerId of state.players) {
    state.caches.buildableNodeIdsByPlayer[playerId] = buildableNodes(
      state,
      board,
      playerId,
      { initialPlacement: isPlacement }
    );
    state.caches.buildableEdgeIdsByPlayer[playerId] = buildableEdges(
      state,
      board,
      playerId,
      {
        initialPlacement: isPlacement,
        fromNodeId: state.pendingRoadFromNodeIdByPlayer[playerId] ?? undefined
      }
    );
  }
  return state;
}

export function applyPlaceSettlement(
  state: GameState,
  board: BoardTopology,
  nodeId: NodeId,
  playerId: string,
  { initialPlacement }: { initialPlacement: boolean }
) {
  const playerState = state.playerStateById[playerId];
  if (!playerState) {
    return { ok: false, state, error: "unknown-player" } as const;
  }
  if (playerState.settlementsRemaining <= 0) {
    return { ok: false, state, error: "no-pieces-left" } as const;
  }
  const legal = buildableNodes(state, board, playerId, { initialPlacement });
  if (!legal.includes(nodeId)) {
    return { ok: false, state, error: "illegal-settlement" } as const;
  }
  state.buildingsByNodeId[nodeId] = { ownerId: playerId, type: "settlement" };
  playerState.settlementsRemaining -= 1;
  if (initialPlacement) {
    state.pendingRoadFromNodeIdByPlayer[playerId] = nodeId;
  }
  const distributions = initialPlacement
    ? applyInitialPlacementResources(state, board, nodeId, playerId)
    : [];
  recomputeCaches(state, board);
  recomputeLongestRoad(state, board);
  checkAndApplyWin(state, playerId);
  return { ok: true, state, distributions } as const;
}

export function applyPlaceRoad(
  state: GameState,
  board: BoardTopology,
  edgeId: EdgeId,
  playerId: string,
  { initialPlacement }: { initialPlacement: boolean }
) {
  const playerState = state.playerStateById[playerId];
  if (!playerState) {
    return { ok: false, state, error: "unknown-player" } as const;
  }
  if (playerState.roadsRemaining <= 0) {
    return { ok: false, state, error: "no-pieces-left" } as const;
  }
  const legal = buildableEdges(state, board, playerId, {
    initialPlacement,
    fromNodeId: initialPlacement
      ? state.pendingRoadFromNodeIdByPlayer[playerId] ?? undefined
      : undefined
  });
  if (!legal.includes(edgeId)) {
    return { ok: false, state, error: "illegal-road" } as const;
  }
  state.roadsByEdgeId[edgeId] = playerId;
  playerState.roadsRemaining -= 1;
  if (initialPlacement) {
    state.pendingRoadFromNodeIdByPlayer[playerId] = null;
  }
  recomputeCaches(state, board);
  recomputeLongestRoad(state, board);
  checkAndApplyWin(state, playerId);
  return { ok: true, state } as const;
}
