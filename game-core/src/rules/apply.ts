import { BoardTopology } from "../core/topology";
import { GameState } from "../core/state";
import { buildableNodes, buildableEdges } from "./buildability";
import { NodeId, EdgeId } from "../core/ids";

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
  const legal = buildableNodes(state, board, playerId, { initialPlacement });
  if (!legal.includes(nodeId)) {
    return { ok: false, state, error: "illegal-settlement" } as const;
  }
  state.buildingsByNodeId[nodeId] = { ownerId: playerId, type: "settlement" };
  if (initialPlacement) {
    state.pendingRoadFromNodeIdByPlayer[playerId] = nodeId;
  }
  recomputeCaches(state, board);
  return { ok: true, state } as const;
}

export function applyPlaceRoad(
  state: GameState,
  board: BoardTopology,
  edgeId: EdgeId,
  playerId: string,
  { initialPlacement }: { initialPlacement: boolean }
) {
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
  if (initialPlacement) {
    state.pendingRoadFromNodeIdByPlayer[playerId] = null;
  }
  recomputeCaches(state, board);
  return { ok: true, state } as const;
}
