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
  initialBank: () =>{return    createByCounts(
      [ResourceType.BRICK, 19],
      [ResourceType.ORE, 19],
      [ResourceType.SHEEP, 19],
      [ResourceType.WOOD, 19],
      [ResourceType.WHEAT, 19]
    )
  },
  requiredResources: [],
  isResourceAllowed: () => true,
  centerCoords: [{ q: 0, r: 0, s: 0 }],
  //TODO: something about port numbers and shuffling ports?
  //e.g. out of 9 ports, 4 should be ANY, then one of each resource
  portCounts: ()=>
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
      //resource: ResourceType.ANY,
      coordinate: [3,-3,0],
      nodes: [48,49],
      direction: "EAST",
      //NE, SE. so port icon is directly East
      //planks are SE (\) and NE (/),
    },
    {
      //resource: ResourceType.ANY,
      coordinate: [3,-1,-2],
      nodes: [50,51],
      direction: "NORTHEAST",
      //SE, NE
    },
    {
      //resource: ResourceType.SHEEP,
      coordinate: [2,1,-3],
      nodes: [46,45],
      direction: "NORTHEAST",
    },
    {
      //resource: ResourceType.ANY,
      coordinate: [0,3,-3],
      nodes: [35,37],
      direction: "NORTHWEST",
    },
    {
      //resource: ResourceType.ANY,
      coordinate: [-2,3,-1],
      nodes: [24,10],
      direction: "WEST",
    },
    {
      //resource: ResourceType.ANY,
      coordinate: [-3,2,1],
      nodes: [9,8],
      direction: "WEST",
    },
    {
      //resource: ResourceType.ANY,
      coordinate: [-3,0,3],
      nodes: [4,3],
      direction: "SOUTHWEST",
    },
    {
      //resource: ResourceType.ANY,
      coordinate: [-1,-2,3],
      nodes: [16,17],
      direction: "SOUTHEAST",
    },
    {
      //resource: ResourceType.ANY,
      coordinate: [1,-3,2],
      nodes: [26,40],
      direction: "SOUTHEAST",
    },
    
  ],
  hasDefaultPortResources: true,
  rollNumbers: () => [
    2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
  ],
};

// //not implemented:
// developmentCards: () =>  createByCounts([DevCard.VP, 5], [DevCard.MONO, 2],[DevCard.YOP, 2],[DevCard.ROADBUILDER, 2],[DevCard.KNIGHT, 14]),
// defaultRobberLocation
