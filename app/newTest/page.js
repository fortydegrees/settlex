"use client";
import {
  HexGrid,
  Layout,
  Hexagon,
  Text,
  GridGenerator,
  HexUtils,
} from "react-hexgrid";
import { RandomQueue } from "./random-queue";

export const ResourceType = {
  ANY: "Any", // Used for 3:1 ports.
  BRICK: "Brick",
  DESERT: "Desert",
  GOLD: "Gold",
  ORE: "Ore",
  SHEEP: "Sheep",
  WATER: "Water",
  WOOD: "Wood",
  WHEAT: "Wheat",
};

export const STANDARD_RESOURCES = [
  ResourceType.BRICK,
  ResourceType.ORE,
  ResourceType.SHEEP,
  ResourceType.WOOD,
  ResourceType.WHEAT,
];

function createByCounts(...valueCounts) {
  const vals = [];
  for (const [val, n] of valueCounts) {
    for (let i = 0; i < n; i++) {
      vals.push(val);
    }
  }
  return vals;
}

export class Hex {
  resource = null;
  rollNumber = null;
  score = null;
  location = null;

  constructor(q, r, s) {
    this.location = { q, r, s };
  }

  reset() {
    this.resource = null;
    this.rollNumber = null;
    this.score = null;
    this.typedPortResources = undefined;
  }

  hasCoordinate(coord) {
    return (
      coord.q === this.location.q &&
      coord.r === this.location.r &&
      coord.s === this.location.s
    );
  }

  //getNeighbouringHexes()

  //getCorners()

  //getEdges()
}

const spec = {
  map: "hexagon",
  radius: 2, //don't like this

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
      corners: [[{q: 1, r: -2, s:1}, "NW"] [{x: 3, y: 0}, "N"]],
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

const strategy = {};

const generateHexes = (shape, radius) => {
  //const { board } = this.config.strategy.generateBoard(this.config.spec);
  //generate a hex for all tiles with (x, y, board)
  //original function goes for each row/thing
  //values are from base.js spec
  //hexgrid catan uses boardRadius.. // https://codesandbox.io/s/catan-web-hnejo?file=/src/engine/boardHelpers.ts:1415-1464

  //quite hacky. what you gonna do when it's a seafarers map?
  const gridHexes = GridGenerator[shape](radius);

  let hexes = [];
  for (let hex of gridHexes) {
    hexes.push(new Hex(hex.q, hex.r, hex.s));
  }

  return hexes;
};

//populates map with required resources
const setRequiredResources = (spec) => {
  for (const [resourceType, location] of spec.requiredResources) {
    getHexByLocation(location).resource = resourceType;
  }
};

const board = {};

const getHexByLocation = (location) => {
  for (const hex of board.hexGrid) {
    if (
      hex.location.q === location.q &&
      hex.location.r === location.r &&
      hex.location.s === location.s
    ) {
      return hex;
    }
  }
  return null; // Return null if no matching hex is found.
};

const generateCornerGrid = () => {
  const corners = new Array(board.hexGrid.length + 1);

  for (let y = 0; y < corners.length; y++) {
    const [row1, row2] = this.getHexRowsForCornerRow(y);
    const numHexCols = row2 ? Math.max(row1.length, row2.length) : row1.length;
    const rowLen = numHexCols + 1;
    // The first index in hexes is also the first index in the corners column.
    const firstCol = findFirstSetIndex(row1, row2);
    corners[y] = new Array(rowLen);
    for (let x = firstCol; x < rowLen; x++) {
      const port =
        this.ports.find((p) => p.corners.find((c) => c.x === x && c.y === y)) ||
        null;
      corners[y][x] = new Corner(x, y, port, this);
    }
  }
  return corners;
};

const generatePorts = (spec) =>{

}

const doNumbersAndResources = (spec) => {
  const rollNumbers = new RandomQueue(spec.rollNumbers());
  const resources = new RandomQueue(spec.resources());
  for (const hex of board.hexGrid) {
    if (resources.length) {
      const excluded = [];
      if (!spec.isResourceAllowed(hex, ResourceType.GOLD)) {
        excluded.push(ResourceType.GOLD);
      }
      if (!spec.isResourceAllowed(hex, ResourceType.DESERT)) {
        excluded.push(ResourceType.DESERT);
      }
      hex.resource = resources.popExcluding(...excluded);
    }
    if (hex.resource !== ResourceType.DESERT && !rollNumbers.isEmpty()) {
      hex.rollNumber = rollNumbers.pop();
    }
  }
  // This is done so that RandomStrategy can be used during development, when a spec isn't
  // fully correct yet. Allowing you to render it and use ?debug=1 to get the coordinates
  // of hexes and corners.
  for (const hex of board.hexGrid) {
    if (!hex.resource) {
      hex.resource = ResourceType.WATER;
    }
  }
};

//list of all hexes that need a resource and a number

export const generateRealBoard = (spec, strategy) => {
  //generate hexGrid. works. have a board with array of hexes & locations
  board.hexGrid = spec.hexes(this);

  console.log(board);

  //populates board Class with required resource co-ordinates from spec
  //requiredResources: [[ResourceType.WATER,[{q:0,r:0,s:0},{q:1,r:0,s:0}]]]
  board.requiredResourceCoordinates = new Set();
  for (const [resourceType, location] of spec.requiredResources) {
    board.requiredResourceCoordinates.add(location);
  }
  setRequiredResources(spec);

  //TODO: all we really need to do is work out the right co-ords (but also means implementing corners..)
  //board.ports = spec.ports()
  //board.cornerGrid = generateCornerGrid()

  generatePorts(spec)

  //basically gets a list of all hexes that aren't 'required' - e.g. ones not filled..
  //can't we just get all hexes that don't have a resource..?

  doNumbersAndResources(spec);

  return board
};

export default function NewTest() {
  const board = generateRealBoard(spec, strategy);
  console.log(board.hexGrid)
  return (

    <HexGrid className="absolute" width={1600} height={1000} viewBox="-50 -50 100 100">
      <Layout
        className="game"
        size={{ x: 10, y: 10 }}
        flat={false}
        spacing={1.02}
        origin={{ x: 0, y: 0 }}
      >
        {board.hexGrid.map((hex, i) => (
          <Hexagon
            key={i}
            q={hex.location.q}
            r={hex.location.r}
            s={hex.location.s}
            //className={hex.blocked ? "blocked" : null}
            //fill={getGradientColors(hex.resource)[0]}
            cellStyle={{ fill: getGradientColors(hex.resource)[0] }}
            data={hex}
          >
            <Text className="text-xxs ">{hex.rollNumber|| ""}</Text>
            {/* {hex.image && <Pattern id={HexUtils.getID(hex)} link={hex.image} />} */}
          </Hexagon>
        ))}
        {/* <Hexagon q={0.33} r={0.33} s={0.66}
        ><Text>HI</Text></Hexagon> */}
      </Layout></HexGrid>
  );
}

function getGradientColors(resource){
    switch (resource) {
      case ResourceType.BRICK:
        return ['#E53935', '#C62828', '#B71C1C'];
      case ResourceType.DESERT:
        return ['#8F6455', '#795548', '#5D4037'];
      case ResourceType.GOLD:
        return ['#EF6C00', '#FFB300', '#FFA000', '#FFCA28'];
      case ResourceType.ORE:
        return ['#CFD8DC', '#B0BEC5', '#90A4AE'];
      case ResourceType.SHEEP:
        return ['#BCFF6B', '#B2FF59', '#9EE34F'];
      case ResourceType.WATER:
        return ['#4a85d3', '#64B5F6'];
      case ResourceType.WHEAT:
        return ['#FFF176', '#FFEE58', '#FFEB3B'];
      case ResourceType.WOOD:
        return ['#3A7822', '#33691E', '#295418'];
      case ResourceType.ANY:
        return ['black', '#6d6d6d'];
      default:
        return ['black', 'white'];
    }
  }