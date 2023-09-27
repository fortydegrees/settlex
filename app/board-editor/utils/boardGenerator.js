//uses hexGrid to generate a board with a specific shape, then just creates a tile with all those

import { GridGenerator } from "react-hexgrid";

import { add } from "./coordinates";

//do these need to go in coordinates? or rename it to map-utils?
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

//given a QRS, return true if a tile exists
//TODO: where to get tiles from?
const getTileByCoord = (map, tileCoordinate) => {
  return (
    map.find(
      (map) => JSON.stringify(map.coordinate) === JSON.stringify(tileCoordinate)
    ) || null
  );
};

//for each hex in the grid, generate a tile object
//this includes generating nodes and edges
const generateTilesNodesEdges = (gridHexes) => {
  let tiles = [];

  //TODO: can we do some smart initialisation of the resource & numbers here? or do we have to wait for whole board to be generated
  var tileAutoinc = 0;
  var nodeAutoinc = 0
  var edgeAutoinc = 0

  for (let hex of gridHexes) {
    var { nodes, edges, nodeAutoinc, edgeAutoinc } = getNodesAndEdges(gridHexes, [hex.q, hex.r, hex.s], nodeAutoinc , edgeAutoinc);
    tiles.push({
      id: tileAutoinc++,
      coordinate: [hex.q, hex.r, hex.s],
      type: TileType.EMPTY, //i.e. landTile, waterTile (can't have number)
      nodes: nodes,
      edges: edges
    });
  }

  return tiles;
};

export const generateBoard = () => {
  const shape = "hexagon"
  const radius = 3

  //generate hexes with co-ordinates
  const gridHexes = GridGenerator[shape](radius);

  //turn them into tiles, nodes and edges
  const map = generateTilesNodesEdges(gridHexes)

  return map;
};



//TODO: the following should be in some kind of util file

const getEdgeNodes = (edgeRef) => {
  return {
    ["EAST"]: ["NORTHEAST", "SOUTHEAST"],
    ["SOUTHEAST"]: ["SOUTHEAST", "SOUTH"],
    ["SOUTHWEST"]: ["SOUTH", "SOUTHWEST"],
    ["WEST"]: ["SOUTHWEST", "NORTHWEST"],
    ["NORTHWEST"]: ["NORTHWEST", "NORTH"],
    ["NORTHEAST"]: ["NORTH", "NORTHEAST"],
  }[edgeRef];
};

//for a given tile, create all nodes and edges (that don't already exist)
const getNodesAndEdges = (hexGrid, coordinate, nodeAutoinc, edgeAutoinc) => {
  const nodes = {
    ["NORTH"]: null,
    ["NORTHEAST"]: null,
    ["SOUTHEAST"]: null,
    ["SOUTH"]: null,
    ["SOUTHWEST"]: null,
    ["NORTHWEST"]: null,
  };

  const edges = {
    ["EAST"]: null,
    ["SOUTHEAST"]: null,
    ["SOUTHWEST"]: null,
    ["WEST"]: null,
    ["NORTHWEST"]: null,
    ["NORTHEAST"]: null,
  };

  //get all neighborTiles
  var neighborTiles = [];
  //get the co-ordinate of every neighboring tile (NW,NE,E,SE,SW,W)
  //if there's a tile on that co-ord, then it's a neighborTile
  for (let dir of Object.keys(Direction)) {
    const neighborDirection = Direction[dir];
    const coord = add(coordinate, UNIT_VECTORS[neighborDirection]);
    if (getTileByCoord(hexGrid, coord)) {
      neighborTiles.push({ coord, neighborDirection });
    }
  }

  for (const { coord, neighborDirection } of neighborTiles) {
    const neighbor = getTileByCoord(hexGrid, coord);

    try {
      if (neighborDirection === Direction.EAST) {
        nodes["NORTHEAST"] = neighbor.tile.nodes["NORTHWEST"];
        nodes["SOUTHEAST"] = neighbor.tile.nodes["SOUTHWEST"];
        edges["EAST"] = neighbor.tile.edges["WEST"];
      } else if (neighborDirection === Direction.SOUTHEAST) {
        nodes["SOUTH"] = neighbor.tile.nodes["NORTHWEST"];
        nodes["SOUTHEAST"] = neighbor.tile.nodes["NORTH"];
        edges["SOUTHEAST"] = neighbor.tile.edges["NORTHWEST"];
      } else if (neighborDirection === Direction.SOUTHWEST) {
        nodes["SOUTH"] = neighbor.tile.nodes["NORTHEAST"];
        nodes["SOUTHWEST"] = neighbor.tile.nodes["NORTH"];
        edges["SOUTHWEST"] = neighbor.tile.edges["NORTHEAST"];
      } else if (neighborDirection === Direction.WEST) {
        nodes["NORTHWEST"] = neighbor.tile.nodes["NORTHEAST"];
        nodes["SOUTHWEST"] = neighbor.tile.nodes["SOUTHEAST"];
        edges["WEST"] = neighbor.tile.edges["EAST"];
      } else if (neighborDirection === Direction.NORTHWEST) {
        nodes["NORTH"] = neighbor.tile.nodes["SOUTHEAST"];
        nodes["NORTHWEST"] = neighbor.tile.nodes["SOUTH"];
        edges["NORTHWEST"] = neighbor.tile.edges["SOUTHEAST"];
      } else if (neighborDirection === Direction.NORTHEAST) {
        nodes["NORTH"] = neighbor.tile.nodes["SOUTHWEST"];
        nodes["NORTHEAST"] = neighbor.tile.nodes["SOUTH"];
        edges["NORTHEAST"] = neighbor.tile.edges["SOUTHWEST"];
      }
    } catch {
      //node doesn't exist
      continue;
    }
  }

  //TODO: some rough 'id' logic for nodes & edges?
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
