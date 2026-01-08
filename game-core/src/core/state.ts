import { EdgeId, NodeId } from "./ids";

export type Building = { ownerId: string; type: string };

export type GameState = {
  phase: "placement" | "normal";
  players: string[];
  buildingsByNodeId: Record<NodeId, Building>;
  roadsByEdgeId: Record<EdgeId, string>;
  pendingRoadFromNodeIdByPlayer: Record<string, NodeId | null>;
  caches: {
    buildableNodeIdsByPlayer: Record<string, NodeId[]>;
    buildableEdgeIdsByPlayer: Record<string, EdgeId[]>;
  };
};

export function createEmptyState(players: string[]): GameState {
  const pending: Record<string, NodeId | null> = {};
  const buildableNodes: Record<string, NodeId[]> = {};
  const buildableEdges: Record<string, EdgeId[]> = {};
  for (const p of players) {
    pending[p] = null;
    buildableNodes[p] = [];
    buildableEdges[p] = [];
  }
  return {
    phase: "placement",
    players,
    buildingsByNodeId: {},
    roadsByEdgeId: {},
    pendingRoadFromNodeIdByPlayer: pending,
    caches: {
      buildableNodeIdsByPlayer: buildableNodes,
      buildableEdgeIdsByPlayer: buildableEdges
    }
  };
}
