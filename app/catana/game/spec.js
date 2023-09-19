import {ResourceType, STANDARD_RESOURCES} from "./types"

function createByCounts(...valueCounts) {
  const vals = [];
  for (const [val, n] of valueCounts) {
    for (let i = 0; i < n; i++) {
      vals.push(val);
    }
  }
  return vals;
}
  
export const spec = {
  name: "standard4p",
  map: "hexagon",
  //map: ()=> generateStandardHexes("hexagon", 3),
  shape: ["hexagon", 2],
  dimensions: { width: 5, height: 5 },
  resources: () =>
    createByCounts(
      [ResourceType.BRICK, 3],
      [ResourceType.DESERT, 1],
      [ResourceType.ORE, 3],
      [ResourceType.SHEEP, 4],
      [ResourceType.WOOD, 4],
      [ResourceType.WHEAT, 4]
    ),
  hexes: () => generateHexes(spec.map, spec.radius), //probs needs fixing for seafarers etc
  requiredResources: [],
  isResourceAllowed: () => true,
  centerCoords: [{ q: 0, r: 0, s: 0 }],
  ports: [
    {
      resource: ResourceType.ANY,
      corners: [[{ q: 1, r: -2, s: 1 }, "NW"][({ x: 3, y: 0 }, "N")]],
    },
    // {
    //   resource: ResourceType.SHEEP,
    //   corners: [{x: 5, y: 0}, {x: 6, y: 0}],
    // },
    // {
    //   resource: ResourceType.ANY,
    //   corners: [{x: 8, y: 1}, {x: 9, y: 1}],
    // },
    // {
    //   resource: ResourceType.ANY,
    //   corners: [{x: 10, y: 2}, {x: 10, y: 3}],
    // }, {
    //   resource: ResourceType.BRICK,
    //   corners: [{x: 9, y: 4}, {x: 8, y: 4}],
    // },
    // {
    //   resource: ResourceType.WOOD,
    //   corners: [{x: 6, y: 5}, {x: 5, y: 5}],
    // },
    // {
    //   resource: ResourceType.ORE,
    //   corners: [{x: 1, y: 2}, {x: 1, y: 1}],
    // },
    // {
    //   resource: ResourceType.ANY,
    //   corners: [{x: 3, y: 5}, {x: 2, y: 5}],
    // }, {
    //   resource: ResourceType.WHEAT,
    //   corners: [{x: 1, y: 4}, {x: 1, y: 3}],
    // }
  ],
  hasDefaultPortResources: true,
  rollNumbers: () => [
    2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
  ],
};

// //not implemented:
// developmentCards: () =>  createByCounts([DevCard.VP, 5], [DevCard.MONO, 2],[DevCard.YOP, 2],[DevCard.ROADBUILDER, 2],[DevCard.KNIGHT, 14]),
// defaultRobberLocation
