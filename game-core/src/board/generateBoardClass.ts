import { RandomQueue, RandomFn } from "../randomQueue";
import { ResourceType, TileTypes } from "../types";
import type { Resource } from "../types";
import { generateStandardHexes, getNumDots } from "./boardUtils";
import { buildCoordinateIndex, getNodesAndEdgesForTile } from "./hexWiring";

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
    const tilesByCoord = buildCoordinateIndex(tiles);
    for (const tile of tiles) {
      const result = getNodesAndEdgesForTile({
        tilesByCoord,
        coordinate: tile.coordinate,
        nodeAutoinc,
        edgeAutoinc,
        sortEdgeNodes: true
      });
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
