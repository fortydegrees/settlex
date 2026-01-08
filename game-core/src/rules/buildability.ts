import { BoardTopology } from "../core/topology";
import { GameState } from "../core/state";
import { NodeId } from "../core/ids";

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
