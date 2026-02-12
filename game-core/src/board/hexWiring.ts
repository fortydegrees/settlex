type Coordinate = [number, number, number];

type TileLike = {
  coordinate: Coordinate;
  tile?: {
    nodes?: Record<string, number>;
    edges?: Record<string, [number, number]>;
  };
};

const DIRECTIONS = {
  EAST: "EAST",
  SOUTHEAST: "SOUTHEAST",
  SOUTHWEST: "SOUTHWEST",
  WEST: "WEST",
  NORTHWEST: "NORTHWEST",
  NORTHEAST: "NORTHEAST"
} as const;

const UNIT_VECTORS: Record<(typeof DIRECTIONS)[keyof typeof DIRECTIONS], Coordinate> = {
  [DIRECTIONS.NORTHEAST]: [1, 0, -1],
  [DIRECTIONS.SOUTHWEST]: [-1, 0, 1],
  [DIRECTIONS.NORTHWEST]: [0, 1, -1],
  [DIRECTIONS.SOUTHEAST]: [0, -1, 1],
  [DIRECTIONS.EAST]: [1, -1, 0],
  [DIRECTIONS.WEST]: [-1, 1, 0]
};

const EDGE_NODE_REFS = {
  EAST: ["NORTHEAST", "SOUTHEAST"],
  SOUTHEAST: ["SOUTHEAST", "SOUTH"],
  SOUTHWEST: ["SOUTH", "SOUTHWEST"],
  WEST: ["SOUTHWEST", "NORTHWEST"],
  NORTHWEST: ["NORTHWEST", "NORTH"],
  NORTHEAST: ["NORTH", "NORTHEAST"]
} as const;

const NEIGHBOR_WIRING = {
  EAST: {
    nodes: [
      ["NORTHEAST", "NORTHWEST"],
      ["SOUTHEAST", "SOUTHWEST"]
    ],
    edge: ["EAST", "WEST"]
  },
  SOUTHEAST: {
    nodes: [
      ["SOUTH", "NORTHWEST"],
      ["SOUTHEAST", "NORTH"]
    ],
    edge: ["SOUTHEAST", "NORTHWEST"]
  },
  SOUTHWEST: {
    nodes: [
      ["SOUTH", "NORTHEAST"],
      ["SOUTHWEST", "NORTH"]
    ],
    edge: ["SOUTHWEST", "NORTHEAST"]
  },
  WEST: {
    nodes: [
      ["NORTHWEST", "NORTHEAST"],
      ["SOUTHWEST", "SOUTHEAST"]
    ],
    edge: ["WEST", "EAST"]
  },
  NORTHWEST: {
    nodes: [
      ["NORTH", "SOUTHEAST"],
      ["NORTHWEST", "SOUTH"]
    ],
    edge: ["NORTHWEST", "SOUTHEAST"]
  },
  NORTHEAST: {
    nodes: [
      ["NORTH", "SOUTHWEST"],
      ["NORTHEAST", "SOUTH"]
    ],
    edge: ["NORTHEAST", "SOUTHWEST"]
  }
} as const;

function add(
  acoord: readonly [number, number, number],
  bcoord: readonly [number, number, number]
): Coordinate {
  const [x, y, z] = acoord;
  const [u, v, w] = bcoord;
  return [x + u, y + v, z + w];
}

export function coordinateKey(coord: readonly [number, number, number]): string {
  return `${coord[0]}|${coord[1]}|${coord[2]}`;
}

export function buildCoordinateIndex<T extends { coordinate: Coordinate }>(
  tiles: T[]
): Map<string, T> {
  return new Map(tiles.map((tile) => [coordinateKey(tile.coordinate), tile]));
}

export function getNodesAndEdgesForTile({
  tilesByCoord,
  coordinate,
  nodeAutoinc,
  edgeAutoinc,
  sortEdgeNodes = false
}: {
  tilesByCoord: Map<string, TileLike>;
  coordinate: Coordinate;
  nodeAutoinc: number;
  edgeAutoinc: number;
  sortEdgeNodes?: boolean;
}) {
  const nodes: Record<string, number | null> = {
    NORTH: null,
    NORTHEAST: null,
    SOUTHEAST: null,
    SOUTH: null,
    SOUTHWEST: null,
    NORTHWEST: null
  };

  const edges: Record<string, [number, number] | null> = {
    EAST: null,
    SOUTHEAST: null,
    SOUTHWEST: null,
    WEST: null,
    NORTHWEST: null,
    NORTHEAST: null
  };

  for (const direction of Object.values(DIRECTIONS)) {
    const vector = UNIT_VECTORS[direction];
    const neighbor = tilesByCoord.get(coordinateKey(add(coordinate, vector)));
    const neighborNodes = neighbor?.tile?.nodes;
    const neighborEdges = neighbor?.tile?.edges;
    if ((neighborNodes && !neighborEdges) || (!neighborNodes && neighborEdges)) {
      throw new Error(
        `Incomplete neighbor topology for ${coordinateKey(
          neighbor?.coordinate ?? coordinate
        )}`
      );
    }
    if (!neighborNodes || !neighborEdges) {
      continue;
    }

    const rules = NEIGHBOR_WIRING[direction];
    for (const [targetNode, sourceNode] of rules.nodes) {
      const sourceValue = neighborNodes[sourceNode];
      if (sourceValue !== undefined) {
        nodes[targetNode] = sourceValue;
      }
    }
    const [targetEdge, sourceEdge] = rules.edge;
    const sourceEdgeNodes = neighborEdges[sourceEdge];
    if (sourceEdgeNodes) {
      edges[targetEdge] = sourceEdgeNodes;
    }
  }

  for (const nodeRef of Object.keys(nodes)) {
    if (nodes[nodeRef] === null) {
      nodes[nodeRef] = nodeAutoinc;
      nodeAutoinc += 1;
    }
  }

  for (const edgeRef of Object.keys(edges)) {
    if (edges[edgeRef] === null) {
      const [aNodeRef, bNodeRef] =
        EDGE_NODE_REFS[edgeRef as keyof typeof EDGE_NODE_REFS];
      const edgeNodes = [nodes[aNodeRef] as number, nodes[bNodeRef] as number] as [
        number,
        number
      ];
      edges[edgeRef] = sortEdgeNodes
        ? ((edgeNodes.slice().sort((a, b) => a - b) as [number, number]))
        : edgeNodes;
      edgeAutoinc += 1;
    }
  }

  return { nodes, edges, nodeAutoinc, edgeAutoinc };
}
