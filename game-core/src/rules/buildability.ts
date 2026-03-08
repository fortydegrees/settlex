import { BoardTopology } from "../core/topology";
import { GameState } from "../core/state";
import { EdgeId, NodeId } from "../core/ids";

export function buildableNodes(
  state: GameState,
  board: BoardTopology,
  playerId: string,
  { initialPlacement }: { initialPlacement: boolean }
): NodeId[] {
  const occupied = new Set(
    Object.keys(state.buildingsByNodeId).map((n) => Number(n))
  );
  const blocked = new Set<NodeId>(occupied);
  for (const node of occupied) {
    const neighbors = board.nodeNeighbors[node] ?? [];
    for (const n of neighbors) blocked.add(n);
  }

  const candidates = initialPlacement
    ? board.landNodeIds
    : nodesConnectedToPlayerRoads(state, board, playerId);

  return candidates.filter((n) => !blocked.has(n));
}

export function buildableEdges(
  state: GameState,
  board: BoardTopology,
  playerId: string,
  { initialPlacement, fromNodeId }: { initialPlacement: boolean; fromNodeId?: NodeId }
): EdgeId[] {
  const occupied = new Set(Object.keys(state.roadsByEdgeId));
  const candidates = new Set<EdgeId>();

  if (initialPlacement) {
    if (fromNodeId === undefined) return [];
    for (const e of board.nodeEdges[fromNodeId] ?? []) candidates.add(e);
  } else {
    const nodes = new Set<NodeId>();
    for (const [edgeId, ownerId] of Object.entries(state.roadsByEdgeId)) {
      if (ownerId !== playerId) continue;
      const [a, b] = board.edgeNodes[edgeId];
      const aBuilding = state.buildingsByNodeId[a];
      if (!aBuilding || aBuilding.ownerId === playerId) {
        nodes.add(a);
      }
      const bBuilding = state.buildingsByNodeId[b];
      if (!bBuilding || bBuilding.ownerId === playerId) {
        nodes.add(b);
      }
    }
    for (const [nodeId, building] of Object.entries(state.buildingsByNodeId)) {
      if (building.ownerId === playerId) nodes.add(Number(nodeId));
    }
    for (const nodeId of nodes) {
      for (const e of board.nodeEdges[nodeId] ?? []) candidates.add(e);
    }
  }

  return Array.from(candidates).filter((e) => !occupied.has(e));
}

function nodesConnectedToPlayerRoads(
  state: GameState,
  board: BoardTopology,
  playerId: string
): NodeId[] {
  const nodes = new Set<NodeId>();
  for (const [edgeId, ownerId] of Object.entries(state.roadsByEdgeId)) {
    if (ownerId !== playerId) continue;
    const [a, b] = board.edgeNodes[edgeId];
    nodes.add(a);
    nodes.add(b);
  }
  return Array.from(nodes);
}
