import { RandomQueue, RandomFn } from "../randomQueue";
import { ResourceType, TileTypes } from "../types";
import type { Resource } from "../types";
import { generateStandardHexes, getNumDots } from "./boardUtils";
import { resolveBoardSpec } from "./boardSpecs";
import type { BoardConfig } from "./boardConfigs";
import { buildSpiralOrder } from "./officialSpiral";
import { BalancedBoard } from "./generateBalancedBoard";
import { buildCoordinateIndex, getNodesAndEdgesForTile } from "./hexWiring";

const assignRandomTerrain = (tiles: any[], spec: any, rng: RandomFn) => {
  const resources = new RandomQueue(spec.resources(), rng);
  for (const tile of tiles) {
    if (!resources.length) {
      break;
    }
    const excluded: string[] = [];
    if (!spec.isResourceAllowed(tile.tile, ResourceType.GOLD)) {
      excluded.push(ResourceType.GOLD);
    }
    if (!spec.isResourceAllowed(tile.tile, ResourceType.DESERT)) {
      excluded.push(ResourceType.DESERT);
    }
    const resource = resources.popExcluding(...excluded);
    if (resource === undefined) {
      throw new Error("Unable to place resource for random terrain generation.");
    }
    tile.tile.resource = resource;
    tile.type = TileTypes.LAND;
  }
};

const assignRandomNumbers = (tiles: any[], spec: any, rng: RandomFn) => {
  const rollNumbers = new RandomQueue(spec.rollNumbers(), rng);
  for (const tile of tiles) {
    if (tile.tile.resource !== ResourceType.DESERT && !rollNumbers.isEmpty()) {
      tile.tile.number = rollNumbers.pop();
      tile.type = TileTypes.LAND;
    }
  }
};

const assignOfficialNumbers = (
  tiles: any[],
  spec: any,
  rng: RandomFn,
  options?: BoardConfig["generation"]["options"]
) => {
  if (!spec.officialNumbers) {
    throw new Error("Spec must include officialNumbers for official placement.");
  }
  const startCorner =
    options?.official?.startCorner === "fixed"
      ? 0
      : Math.floor(rng() * 6);
  const spiral = buildSpiralOrder(spec.radius, startCorner);
  const byCoord = new Map(tiles.map((t: any) => [t.coordinate.join(","), t]));
  let numberIndex = 0;
  for (const coord of spiral) {
    const tile = byCoord.get(coord.join(","));
    if (!tile) {
      continue;
    }
    if (tile.tile.resource === ResourceType.DESERT) {
      continue;
    }
    if (numberIndex >= spec.officialNumbers.length) {
      throw new Error("Official number placement exceeded available numbers.");
    }
    tile.tile.number = spec.officialNumbers[numberIndex];
    tile.type = TileTypes.LAND;
    numberIndex++;
  }
  if (numberIndex !== spec.officialNumbers.length) {
    throw new Error("Official number placement did not consume all numbers.");
  }
};

const assignPorts = (tiles: any[], spec: any, rng: RandomFn) => {
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
};

const assignWaterResources = (tiles: any[]) => {
  for (const { tile } of tiles) {
    if (!tile.resource) {
      tile.resource = ResourceType.WATER;
    }
  }
};

export const generateBoard = (config: BoardConfig, rng: RandomFn, empty = false) => {
  const spec = resolveBoardSpec(config.specId);
  const shape = spec.map;
  const radius = spec.radius;
  if (shape === undefined || radius === undefined) {
    throw new Error("Spec must include map/radius or shape");
  }

  const wantsBalanced =
    config.generation.terrain === "balanced" ||
    config.generation.numbers === "balanced";

  if (!empty && wantsBalanced) {
    if (
      config.generation.terrain !== "balanced" ||
      config.generation.numbers !== "balanced"
    ) {
      throw new Error(
        "Balanced generation requires both terrain and numbers to be balanced."
      );
    }
    const balanced = new BalancedBoard(
      {
        desertPlacement: "Random",
        resourceDistribution: 1,
        numberDistribution: 1
      },
      rng
    );
    const { board } = balanced.generateBoard(spec);
    return board.tiles;
  }

  const tiles = generateStandardHexes(shape, radius);
  if (!empty) {
    if (config.generation.terrain === "random" || config.generation.terrain === "official") {
      assignRandomTerrain(tiles, spec, rng);
    }

    if (config.generation.numbers === "random") {
      assignRandomNumbers(tiles, spec, rng);
    } else if (config.generation.numbers === "official") {
      assignOfficialNumbers(tiles, spec, rng, config.generation.options);
    }

    assignWaterResources(tiles);
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
      sortEdgeNodes: false
    });
    nodeAutoinc = result.nodeAutoinc;
    edgeAutoinc = result.edgeAutoinc;
    tile.tile.nodes = result.nodes;
    tile.tile.edges = result.edges;
  }

  assignPorts(tiles, spec, rng);

  return tiles;
};

export { getNumDots };
