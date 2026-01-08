import { ResourceType } from "./types";
import { generateStandardHexes } from "./board/boardUtils";

function createByCounts<T>(...valueCounts: Array<[T, number]>): T[] {
  const vals: T[] = [];
  for (const [val, n] of valueCounts) {
    for (let i = 0; i < n; i++) {
      vals.push(val);
    }
  }
  return vals;
}

// https://github.com/cgagliardi/settlers-setup/blob/master/src/app/board/specs/standard.ts
export const spec = {
  name: "standard4p",
  map: "hexagon",
  radius: 2,
  resources: () =>
    createByCounts(
      [ResourceType.BRICK, 3],
      [ResourceType.DESERT, 1],
      [ResourceType.ORE, 3],
      [ResourceType.SHEEP, 4],
      [ResourceType.WOOD, 4],
      [ResourceType.WHEAT, 4]
    ),
  hexes: (board: { map: string; radius: number }) =>
    generateStandardHexes(board.map, board.radius),
  initialBank: () =>
    createByCounts(
      [ResourceType.BRICK, 19],
      [ResourceType.ORE, 19],
      [ResourceType.SHEEP, 19],
      [ResourceType.WOOD, 19],
      [ResourceType.WHEAT, 19]
    ),
  requiredResources: [],
  isResourceAllowed: () => true,
  centerCoords: [{ q: 0, r: 0, s: 0 }],
  defaultRobber: "desert",
  portCounts: () =>
    createByCounts(
      [ResourceType.ANY, 4],
      [ResourceType.BRICK, 1],
      [ResourceType.ORE, 1],
      [ResourceType.SHEEP, 1],
      [ResourceType.WOOD, 1],
      [ResourceType.WHEAT, 1]
    ),
  ports: [
    {
      coordinate: [3, -3, 0],
      nodes: [48, 49],
      direction: "EAST"
    },
    {
      coordinate: [3, -1, -2],
      nodes: [50, 51],
      direction: "NORTHEAST"
    },
    {
      coordinate: [2, 1, -3],
      nodes: [46, 45],
      direction: "NORTHEAST"
    },
    {
      coordinate: [0, 3, -3],
      nodes: [35, 37],
      direction: "NORTHWEST"
    },
    {
      coordinate: [-2, 3, -1],
      nodes: [24, 10],
      direction: "WEST"
    },
    {
      coordinate: [-3, 2, 1],
      nodes: [9, 8],
      direction: "WEST"
    },
    {
      coordinate: [-3, 0, 3],
      nodes: [4, 3],
      direction: "SOUTHWEST"
    },
    {
      coordinate: [-1, -2, 3],
      nodes: [16, 17],
      direction: "SOUTHEAST"
    },
    {
      coordinate: [1, -3, 2],
      nodes: [26, 40],
      direction: "SOUTHEAST"
    }
  ],
  hasDefaultPortResources: true,
  rollNumbers: () => [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]
};
