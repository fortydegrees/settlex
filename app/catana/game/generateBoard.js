import { GridGenerator } from "react-hexgrid";
import { RandomQueue } from "../utils/randomQueue";
import { ResourceType, TileTypes, STANDARD_RESOURCES } from "./types";

let idCounter = 0;

const generateStandardHexes = (shape, radius) => {
  const gridHexes = GridGenerator[shape](radius);

  let tiles = [];
  for (let hex of gridHexes) {
    tiles.push({
      coordinate: [hex.q, hex.r, hex.s],
      type: TileTypes.EMPTY,
      tile: {
        id: idCounter++,
        // "resource": "WHEAT",
        // "number": 3
      },
    });
  }

  return tiles;
};

//default for now. just randomizes
const doNumbersAndResources = (tiles, spec) => {
  const rollNumbers = new RandomQueue(spec.rollNumbers());
  const resources = new RandomQueue(spec.resources());
  for (const tile of tiles) {
    if (resources.length) {
      const excluded = [];
      if (!spec.isResourceAllowed(tile.tile, ResourceType.GOLD)) {
        excluded.push(ResourceType.GOLD);
      }
      if (!spec.isResourceAllowed(tile.tile, ResourceType.DESERT)) {
        excluded.push(ResourceType.DESERT);
        
      }
      //bit of a hack for desert..
      const resource = resources.popExcluding(...excluded);
      tile.tile.resource = resource
      if(resource == ResourceType.DESERT){
        tile.type = TileTypes.LAND
      }
    }
    if (tile.tile.resource !== ResourceType.DESERT && !rollNumbers.isEmpty()) {
      tile.tile.number = rollNumbers.pop();
      tile.type = TileTypes.LAND
    }
  }
  // This is done so that RandomStrategy can be used during development, when a spec isn't
  // fully correct yet. Allowing you to render it and use ?debug=1 to get the coordinates
  // of hexes and corners.
  for (const { tile } of tiles) {
    if (!tile.resource) {
      tile.resource = ResourceType.WATER;
    }
  }
};

const getTileByCoord = (coordinate) => {
  return (
    tiles.find(
      (tile) => JSON.stringify(tile.coordinate) === JSON.stringify(coordinate)
    ) || null
  );
};

const getNodesAndEdges = (tiles, coordinate, nodeAutoinc, edgeAutoinc) => {
  //idk what these do. port from chatGPT/catanotron python
  const getNodeRef = (name) => name;
  const getEdgeRef = (name) => name;
  function add(acoord, bcoord) {
    const [x, y, z] = acoord;
    const [u, v, w] = bcoord;
    return [x + u, y + v, z + w];
  }

  const getEdgeNodes = (edgeRef) => {
    return {
      [getEdgeRef("EAST")]: [getNodeRef("NORTHEAST"), getNodeRef("SOUTHEAST")],
      [getEdgeRef("SOUTHEAST")]: [getNodeRef("SOUTHEAST"), getNodeRef("SOUTH")],
      [getEdgeRef("SOUTHWEST")]: [getNodeRef("SOUTH"), getNodeRef("SOUTHWEST")],
      [getEdgeRef("WEST")]: [getNodeRef("SOUTHWEST"), getNodeRef("NORTHWEST")],
      [getEdgeRef("NORTHWEST")]: [getNodeRef("NORTHWEST"), getNodeRef("NORTH")],
      [getEdgeRef("NORTHEAST")]: [getNodeRef("NORTH"), getNodeRef("NORTHEAST")],
    }[edgeRef];
  };

  const Direction = {
    EAST: "EAST",
    SOUTHEAST: "SOUTHEAST",
    SOUTHWEST: "SOUTHWEST",
    WEST: "WEST",
    NORTHWEST: "NORTHWEST",
    NORTHEAST: "NORTHEAST",
  };

  const UNIT_VECTORS = {
    [Direction.NORTHEAST]: [1, 0, -1],
    [Direction.SOUTHWEST]: [-1, 0, 1],
    [Direction.NORTHWEST]: [0, 1, -1],
    [Direction.SOUTHEAST]: [0, -1, 1],
    [Direction.EAST]: [1, -1, 0],
    [Direction.WEST]: [-1, 1, 0],
  };

  const nodes = {
    [getNodeRef("NORTH")]: null,
    [getNodeRef("NORTHEAST")]: null,
    [getNodeRef("SOUTHEAST")]: null,
    [getNodeRef("SOUTH")]: null,
    [getNodeRef("SOUTHWEST")]: null,
    [getNodeRef("NORTHWEST")]: null,
  };

  const edges = {
    [getEdgeRef("EAST")]: null,
    [getEdgeRef("SOUTHEAST")]: null,
    [getEdgeRef("SOUTHWEST")]: null,
    [getEdgeRef("WEST")]: null,
    [getEdgeRef("NORTHWEST")]: null,
    [getEdgeRef("NORTHEAST")]: null,
  };

  //get all neighbortiles (if they exist)
  var neighborTiles = [];
  for (let dir of Object.keys(Direction)) {
    const neighborDirection = Direction[dir];
    const coord = add(coordinate, UNIT_VECTORS[neighborDirection]);
    if (getTileByCoord(coord)) {
      neighborTiles.push({ coord, neighborDirection });
    }
  }

  for (const { coord, neighborDirection } of neighborTiles) {
    const neighbor = getTileByCoord(coord);

    try {
      if (neighborDirection === Direction.EAST) {
        nodes[getNodeRef("NORTHEAST")] =
          neighbor.tile.nodes[getNodeRef("NORTHWEST")];
        nodes[getNodeRef("SOUTHEAST")] =
          neighbor.tile.nodes[getNodeRef("SOUTHWEST")];
        edges[getEdgeRef("EAST")] = neighbor.tile.edges[getEdgeRef("WEST")];
      } else if (neighborDirection === Direction.SOUTHEAST) {
        nodes[getNodeRef("SOUTH")] =
          neighbor.tile.nodes[getNodeRef("NORTHWEST")];
        nodes[getNodeRef("SOUTHEAST")] =
          neighbor.tile.nodes[getNodeRef("NORTH")];
        edges[getEdgeRef("SOUTHEAST")] =
          neighbor.tile.edges[getEdgeRef("NORTHWEST")];
      } else if (neighborDirection === Direction.SOUTHWEST) {
        nodes[getNodeRef("SOUTH")] =
          neighbor.tile.nodes[getNodeRef("NORTHEAST")];
        nodes[getNodeRef("SOUTHWEST")] =
          neighbor.tile.nodes[getNodeRef("NORTH")];
        edges[getEdgeRef("SOUTHWEST")] =
          neighbor.tile.edges[getEdgeRef("NORTHEAST")];
      } else if (neighborDirection === Direction.WEST) {
        nodes[getNodeRef("NORTHWEST")] =
          neighbor.tile.nodes[getNodeRef("NORTHEAST")];
        nodes[getNodeRef("SOUTHWEST")] =
          neighbor.tile.nodes[getNodeRef("SOUTHEAST")];
        edges[getEdgeRef("WEST")] = neighbor.tile.edges[getEdgeRef("EAST")];
      } else if (neighborDirection === Direction.NORTHWEST) {
        nodes[getNodeRef("NORTH")] =
          neighbor.tile.nodes[getNodeRef("SOUTHEAST")];
        nodes[getNodeRef("NORTHWEST")] =
          neighbor.tile.nodes[getNodeRef("SOUTH")];
        edges[getEdgeRef("NORTHWEST")] =
          neighbor.tile.edges[getEdgeRef("SOUTHEAST")];
      } else if (neighborDirection === Direction.NORTHEAST) {
        nodes[getNodeRef("NORTH")] =
          neighbor.tile.nodes[getNodeRef("SOUTHWEST")];
        nodes[getNodeRef("NORTHEAST")] =
          neighbor.tile.nodes[getNodeRef("SOUTH")];
        edges[getEdgeRef("NORTHEAST")] =
          neighbor.tile.edges[getEdgeRef("SOUTHWEST")];
      }
    } catch {
      //node doesn't exist
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
      const edgeNodes = [nodes[a_noderef], nodes[b_noderef]];
      edges[edgeref] = edgeNodes;
      edgeAutoinc++;
    }
  }

  return { nodes, edges, nodeAutoinc, edgeAutoinc };
};

var tiles = [];
//used for generating balanced board. generate board with ports, but no resources or numbers..
//TODO: should really be refactored..
// export const generateBlankBoard = (spec) => {
//   tiles = []
//   tiles = generateStandardHexes(spec.shape[0], spec.shape[1]);

//   const portCounts = new RandomQueue(spec.portCounts());
//   for (const port of spec.ports) {
//     if (portCounts.length) {
//       tiles.push({
//         coordinate: port.coordinate,

//         //should have type here e.g. port
//         type: TileTypes.PORT,
//         tile: {
//           direction: port.direction,
//           id: idCounter++,
//           nodes: port.nodes, //HORRIBLE. different format. TODO: FIX ALL THIS JANK
//           edges: {},
//           resource: portCounts.pop(),
//         },
//       });
//     }
//   }

//   return tiles

// }


//generates whole board..
export const generateBoard = (spec, empty=false) => {
  //first we generate the tiles with their co-ords
  //generate tiles with co-ords (no resources)
  tiles = generateStandardHexes(spec.shape[0], spec.shape[1]);

  //generates random dice num and resource for each tile
  if (empty == false)  doNumbersAndResources(tiles, spec);

  //test to make sure grid coords work
  // tiles.push({coordinate:[-3, 0, 4],
  //   tile:{
  //     edges: {},
  //     id: 19,
  //     nodes: {},
  //     number: 3,
  //     resource: "Sheep"
  //   }})
  var nodeAutoinc = 0;
  var edgeAutoinc = 0;
  var tileAutoinc = 0;
  var portAutoinc = 0;
  for (let tile of tiles) {
    var { nodes, edges, nodeAutoinc, edgeAutoinc } = getNodesAndEdges(
      tiles,
      tile.coordinate,
      nodeAutoinc,
      edgeAutoinc
    );
    //tile.type = TileTypes.RESOURCE;
    tile.tile.nodes = nodes;
    tile.tile.edges = edges;

    //nodeAutoinc++;
  }

  //doing ports
  const portCounts = new RandomQueue(spec.portCounts());
  for (const port of spec.ports) {
    if (portCounts.length) {
      tiles.push({
        coordinate: port.coordinate,

        //should have type here e.g. port
        type: TileTypes.PORT,
        tile: {
          direction: port.direction,
          id: idCounter++,
          nodes: port.nodes, //HORRIBLE. different format. TODO: FIX ALL THIS JANK
          edges: {},
          resource: portCounts.pop(),
        },
      });
    }
  }

  //now generate nodes

  // "0": {
  //     "id": 0,
  //     "tile_coordinate": [
  //         1,
  //         0,
  //         -1
  //     ],
  //     "direction": "SOUTHWEST",
  //     "building": null,
  //     "color": null
  // },

  //then we set our required resources for certain tiles (e.g. sea for seafarers)
  // board.requiredResourceCoordinates = new Set();
  // for (const [resourceType, location] of spec.requiredResources) {
  //   board.requiredResourceCoordinates.add(location);
  // }
  // setRequiredResources(spec);

  // //TODO: all we really need to do is work out the right co-ords (but also means implementing corners..)
  // //board.ports = spec.ports()
  // //board.cornerGrid = generateCornerGrid()

  // generatePorts(spec)

  // //basically gets a list of all hexes that aren't 'required' - e.g. ones not filled..
  // //can't we just get all hexes that don't have a resource..?

  return tiles;

  // return board
};


export const getNumDots = (rollNumber) => {
  if (rollNumber < 7) {
    return rollNumber - 1;
  } else {
    return 13 - rollNumber;
  }
}