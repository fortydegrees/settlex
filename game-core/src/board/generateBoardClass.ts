import { RandomQueue, RandomFn } from "../randomQueue";
import { ResourceType, TileTypes } from "../types";
import type { Resource } from "../types";
import { generateStandardHexes, getNumDots } from "./boardUtils";

const doNumbersAndResources = (tiles: any[], spec: any, rng: RandomFn) => {
  const rollNumbers = new RandomQueue(spec.rollNumbers(), rng);
  const resources = new RandomQueue(spec.resources(), rng);
  for (const tile of tiles) {
    if (resources.length) {
      const excluded: string[] = [];
      if (!spec.isResourceAllowed(tile.tile, ResourceType.GOLD)) {
        excluded.push(ResourceType.GOLD);
      }
      if (!spec.isResourceAllowed(tile.tile, ResourceType.DESERT)) {
        excluded.push(ResourceType.DESERT);
      }
      const resource = resources.popExcluding(...excluded);
      tile.tile.resource = resource;
      if (resource === ResourceType.DESERT) {
        tile.type = TileTypes.LAND;
      }
    }
    if (tile.tile.resource !== ResourceType.DESERT && !rollNumbers.isEmpty()) {
      tile.tile.number = rollNumbers.pop();
      tile.type = TileTypes.LAND;
    }
  }
  for (const { tile } of tiles) {
    if (!tile.resource) {
      tile.resource = ResourceType.WATER;
    }
  }
};

const getNodesAndEdges = (
  tiles: any[],
  coordinate: [number, number, number],
  nodeAutoinc: number,
  edgeAutoinc: number
) => {
  const getNodeRef = (name: string) => name;
  const getEdgeRef = (name: string) => name;
  function add(
    acoord: readonly [number, number, number],
    bcoord: readonly [number, number, number]
  ) {
    const [x, y, z] = acoord;
    const [u, v, w] = bcoord;
    return [x + u, y + v, z + w] as [number, number, number];
  }

  const getEdgeNodes = (edgeRef: string) => {
    return {
      [getEdgeRef("EAST")]: [getNodeRef("NORTHEAST"), getNodeRef("SOUTHEAST")],
      [getEdgeRef("SOUTHEAST")]: [getNodeRef("SOUTHEAST"), getNodeRef("SOUTH")],
      [getEdgeRef("SOUTHWEST")]: [getNodeRef("SOUTH"), getNodeRef("SOUTHWEST")],
      [getEdgeRef("WEST")]: [getNodeRef("SOUTHWEST"), getNodeRef("NORTHWEST")],
      [getEdgeRef("NORTHWEST")]: [getNodeRef("NORTHWEST"), getNodeRef("NORTH")],
      [getEdgeRef("NORTHEAST")]: [getNodeRef("NORTH"), getNodeRef("NORTHEAST")]
    }[edgeRef];
  };

  const Direction = {
    EAST: "EAST",
    SOUTHEAST: "SOUTHEAST",
    SOUTHWEST: "SOUTHWEST",
    WEST: "WEST",
    NORTHWEST: "NORTHWEST",
    NORTHEAST: "NORTHEAST"
  } as const;

  const UNIT_VECTORS = {
    [Direction.NORTHEAST]: [1, 0, -1],
    [Direction.SOUTHWEST]: [-1, 0, 1],
    [Direction.NORTHWEST]: [0, 1, -1],
    [Direction.SOUTHEAST]: [0, -1, 1],
    [Direction.EAST]: [1, -1, 0],
    [Direction.WEST]: [-1, 1, 0]
  } as const;

  const nodes: Record<string, number | null> = {
    [getNodeRef("NORTH")]: null,
    [getNodeRef("NORTHEAST")]: null,
    [getNodeRef("SOUTHEAST")]: null,
    [getNodeRef("SOUTH")]: null,
    [getNodeRef("SOUTHWEST")]: null,
    [getNodeRef("NORTHWEST")]: null
  };

  const edges: Record<string, [number, number] | null> = {
    [getEdgeRef("EAST")]: null,
    [getEdgeRef("SOUTHEAST")]: null,
    [getEdgeRef("SOUTHWEST")]: null,
    [getEdgeRef("WEST")]: null,
    [getEdgeRef("NORTHWEST")]: null,
    [getEdgeRef("NORTHEAST")]: null
  };

  const getTileByCoord = (coord: [number, number, number]) =>
    tiles.find((tile) =>
      JSON.stringify(tile.coordinate) === JSON.stringify(coord)
    ) || null;

  const neighborTiles: Array<{ coord: [number, number, number]; neighborDirection: string }> = [];
  for (const dir of Object.keys(Direction)) {
    const neighborDirection = (Direction as Record<string, string>)[dir];
    const coord = add(coordinate, UNIT_VECTORS[neighborDirection as keyof typeof UNIT_VECTORS]);
    if (getTileByCoord(coord)) {
      neighborTiles.push({ coord, neighborDirection });
    }
  }

  for (const { coord, neighborDirection } of neighborTiles) {
    const neighbor = getTileByCoord(coord);

    try {
      if (neighborDirection === Direction.EAST) {
        nodes[getNodeRef("NORTHEAST")] = neighbor.tile.nodes[getNodeRef("NORTHWEST")];
        nodes[getNodeRef("SOUTHEAST")] = neighbor.tile.nodes[getNodeRef("SOUTHWEST")];
        edges[getEdgeRef("EAST")] = neighbor.tile.edges[getEdgeRef("WEST")] as [number, number];
      } else if (neighborDirection === Direction.SOUTHEAST) {
        nodes[getNodeRef("SOUTH")] = neighbor.tile.nodes[getNodeRef("NORTHWEST")];
        nodes[getNodeRef("SOUTHEAST")] = neighbor.tile.nodes[getNodeRef("NORTH")];
        edges[getEdgeRef("SOUTHEAST")] = neighbor.tile.edges[getEdgeRef("NORTHWEST")] as [number, number];
      } else if (neighborDirection === Direction.SOUTHWEST) {
        nodes[getNodeRef("SOUTH")] = neighbor.tile.nodes[getNodeRef("NORTHEAST")];
        nodes[getNodeRef("SOUTHWEST")] = neighbor.tile.nodes[getNodeRef("NORTH")];
        edges[getEdgeRef("SOUTHWEST")] = neighbor.tile.edges[getEdgeRef("NORTHEAST")] as [number, number];
      } else if (neighborDirection === Direction.WEST) {
        nodes[getNodeRef("NORTHWEST")] = neighbor.tile.nodes[getNodeRef("NORTHEAST")];
        nodes[getNodeRef("SOUTHWEST")] = neighbor.tile.nodes[getNodeRef("SOUTHEAST")];
        edges[getEdgeRef("WEST")] = neighbor.tile.edges[getEdgeRef("EAST")] as [number, number];
      } else if (neighborDirection === Direction.NORTHWEST) {
        nodes[getNodeRef("NORTH")] = neighbor.tile.nodes[getNodeRef("SOUTHEAST")];
        nodes[getNodeRef("NORTHWEST")] = neighbor.tile.nodes[getNodeRef("SOUTH")];
        edges[getEdgeRef("NORTHWEST")] = neighbor.tile.edges[getEdgeRef("SOUTHEAST")] as [number, number];
      } else if (neighborDirection === Direction.NORTHEAST) {
        nodes[getNodeRef("NORTH")] = neighbor.tile.nodes[getNodeRef("SOUTHWEST")];
        nodes[getNodeRef("NORTHEAST")] = neighbor.tile.nodes[getNodeRef("SOUTH")];
        edges[getEdgeRef("NORTHEAST")] = neighbor.tile.edges[getEdgeRef("SOUTHWEST")] as [number, number];
      }
    } catch {
      continue;
    }
  }

  for (const noderef in nodes) {
    if (nodes[noderef] === null) {
      nodes[noderef] = nodeAutoinc;
      nodeAutoinc++;
    }
  }

  for (const edgeref in edges) {
    if (edges[edgeref] === null) {
      const [a_noderef, b_noderef] = getEdgeNodes(edgeref);
      const edgeNodes = [nodes[a_noderef] as number, nodes[b_noderef] as number] as [
        number,
        number
      ];
      edges[edgeref] = (edgeNodes.slice().sort() as [number, number]);
      edgeAutoinc++;
    }
  }

  return { nodes, edges, nodeAutoinc, edgeAutoinc };
};

export class Board {
  tiles: any[];
  nodes: Record<string, any>;
  edges: Record<string, any>;

  constructor(spec: any, isEmpty = false, rng: RandomFn) {
    this.tiles = this.generateBoard(spec, isEmpty, rng);
    this.nodes = {};
    this.edges = {};

    if (!isEmpty) {
      for (const tile of this.tiles) {
        if (tile.type === TileTypes.LAND) {
          for (const node of Object.entries(tile.tile.nodes)) {
            const nodeId = String(node[1]);
            this.nodes[nodeId] = {
              tileId: tile.tile.id,
              tile_coordinate: tile.coordinate,
              direction: node[0],
              building: null
            };
          }
          for (const edge of Object.entries(tile.tile.edges)) {
            const edgeId = (edge[1] as number[]).join(",");
            this.edges[edgeId] = {
              tileId: tile.tile.id,
              tile_coordinate: tile.coordinate,
              direction: edge[0],
              color: null
            };
          }
        }
      }
    } else {
      for (const tile of this.tiles) {
        if (tile.type !== TileTypes.PORT) {
          for (const node of Object.entries(tile.tile.nodes)) {
            const nodeId = String(node[1]);
            this.nodes[nodeId] = {
              tileId: tile.tile.id,
              tile_coordinate: tile.coordinate,
              direction: node[0],
              building: null
            };
          }
          for (const edge of Object.entries(tile.tile.edges)) {
            const edgeId = (edge[1] as number[]).join(",");
            this.edges[edgeId] = {
              tileId: tile.tile.id,
              tile_coordinate: tile.coordinate,
              direction: edge[0],
              color: null
            };
          }
        }
      }
    }
  }

  private generateBoard(spec: any, empty: boolean, rng: RandomFn) {
    const shape = spec.map || (spec.shape ? spec.shape[0] : undefined);
    const radius = spec.radius || (spec.shape ? spec.shape[1] : undefined);
    if (shape === undefined || radius === undefined) {
      throw new Error("Spec must include map/radius or shape");
    }

    const tiles = generateStandardHexes(shape, radius);

    if (empty === false) {
      doNumbersAndResources(tiles, spec, rng);
    }

    let nodeAutoinc = 0;
    let edgeAutoinc = 0;
    for (const tile of tiles) {
      const result = getNodesAndEdges(tiles, tile.coordinate, nodeAutoinc, edgeAutoinc);
      nodeAutoinc = result.nodeAutoinc;
      edgeAutoinc = result.edgeAutoinc;
      tile.tile.nodes = result.nodes;
      tile.tile.edges = result.edges;
    }

    let idCounter = tiles.length;
    const portCounts = new RandomQueue<Resource>(spec.portCounts(), rng);
    for (const port of spec.ports) {
      if (portCounts.length) {
        tiles.push({
          coordinate: port.coordinate,
          type: TileTypes.PORT,
          tile: {
            direction: port.direction,
            id: idCounter++,
            nodes: port.nodes,
            edges: {},
            resource: portCounts.pop() as Resource
          }
        });
      }
    }

    return tiles;
  }
}

export { getNumDots };
