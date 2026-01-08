import { ResourceType, TileTypes } from "../types";
import { EdgeId, NodeId, edgeId } from "./ids";

export type BoardTile = {
  coordinate: [number, number, number];
  type: string;
  tile: {
    id: number;
    resource?: string | null;
    number?: number | null;
    nodes?: Record<string, NodeId>;
    edges?: Record<string, [NodeId, NodeId]>;
    direction?: string;
  };
};

export type BoardTopology = {
  tiles: BoardTile[];
  nodeIds: NodeId[];
  landNodeIds: NodeId[];
  edgeIds: EdgeId[];
  edgeNodes: Record<EdgeId, [NodeId, NodeId]>;
  nodeEdges: Record<NodeId, EdgeId[]>;
  nodeNeighbors: Record<NodeId, NodeId[]>;
  portsByNodeId: Record<NodeId, ResourceType>;
};

export function buildTopology(tiles: BoardTile[]): BoardTopology {
  const nodeSet = new Set<NodeId>();
  const landNodeSet = new Set<NodeId>();
  const edgeNodes: Record<EdgeId, [NodeId, NodeId]> = {};
  const nodeEdges: Record<NodeId, EdgeId[]> = {};
  const nodeNeighbors: Record<NodeId, NodeId[]> = {};
  const portsByNodeId: Record<NodeId, ResourceType> = {};

  for (const tile of tiles) {
    const nodes = tile.tile.nodes ?? {};
    const edges = tile.tile.edges ?? {};

    for (const node of Object.values(nodes)) {
      nodeSet.add(node);
      if (tile.type === TileTypes.LAND) {
        landNodeSet.add(node);
      }
    }

    for (const edge of Object.values(edges)) {
      const [a, b] = edge;
      const id = edgeId(a, b);
      if (!edgeNodes[id]) {
        edgeNodes[id] = [a, b];
      }
      nodeEdges[a] = nodeEdges[a] ?? [];
      nodeEdges[b] = nodeEdges[b] ?? [];
      if (!nodeEdges[a].includes(id)) nodeEdges[a].push(id);
      if (!nodeEdges[b].includes(id)) nodeEdges[b].push(id);
    }

    if (tile.type === TileTypes.PORT && tile.tile.nodes && tile.tile.resource) {
      for (const node of Object.values(tile.tile.nodes)) {
        portsByNodeId[node] = tile.tile.resource as ResourceType;
      }
    }
  }

  for (const id of Object.keys(edgeNodes)) {
    const [a, b] = edgeNodes[id];
    nodeNeighbors[a] = nodeNeighbors[a] ?? [];
    nodeNeighbors[b] = nodeNeighbors[b] ?? [];
    if (!nodeNeighbors[a].includes(b)) nodeNeighbors[a].push(b);
    if (!nodeNeighbors[b].includes(a)) nodeNeighbors[b].push(a);
  }

  return {
    tiles,
    nodeIds: Array.from(nodeSet),
    landNodeIds: Array.from(landNodeSet),
    edgeIds: Object.keys(edgeNodes),
    edgeNodes,
    nodeEdges,
    nodeNeighbors,
    portsByNodeId
  };
}
