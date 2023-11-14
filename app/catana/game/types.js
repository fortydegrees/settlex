export const ResourceType = {

  WOOD: "Wood",
  BRICK: "Brick",
  SHEEP: "Sheep",
  WHEAT: "Wheat",
  ORE: "Ore",
  DESERT: "Desert",
  EMPTY: "Empty",
  ANY: "Any", // Used for 3:1 ports.
  //GOLD: "Gold",
  //WATER: "Water",
};

export const TileTypes = {
  // RESOURCE: "Resource",
  // DESERT: "Desert",
  LAND: "Land",
  PORT: "Port",
  WATER: "Water",
  EMPTY: "Empty",
}

//export const TILE_TYPES = [TileType.EMPTY, TileType.LAND, TileType.WATER]


export const STANDARD_RESOURCES = [
  ResourceType.WOOD,
  ResourceType.BRICK,
  ResourceType.SHEEP,
  ResourceType.WHEAT,
  ResourceType.ORE,
];

export const SPECIAL_TILES = [
  ResourceType.DESERT,
  ResourceType.EMPTY,
]

export const NodeBuildingTypes ={
  SETTLEMENT: "settlement",
  CITY: "city",
}

export const EdgeBuildingTypes ={
  ROAD: 0,
  BOAT: 1,
}



export const TILE_DATA = {
  "Blank": {
      "number": null,
      "type": "BLANK"
  }, //blank/empty is for board editor
  "Resource": {

  },
  "Desert": {},
  "Port": {},
}

export const RESOURCE_ICON_SVGS = {
  "Wood": "/svgs/icon_wood.svg",
  "Brick": "/svgs/icon_brick.svg",
  "Sheep": "/svgs/icon_sheep.svg",
  "Wheat": "/svgs/icon_wheat.svg",
  "Ore": "/svgs/icon_ore.svg",
}

export const RESOURCE_SVGS = {
  "Wood": "https://colonist.io/dist/images/tile_lumber.svg?v168",
  "Brick": "https://colonist.io/dist/images/tile_brick.svg?v168",
  "Sheep": "https://colonist.io/dist/images/tile_wool.svg?v168",
  "Wheat": "https://colonist.io/dist/images/tile_grain.svg?v168",
  "Ore": "https://colonist.io/dist/images/tile_ore.svg?v168",
  "Desert": "https://colonist.io/dist/images/tile_desert.svg?v168",
  //"Ore": "/ore.svg",
  "Empty": '/empty.svg'
}

export const NUMBER_SVGS = (number) => {
  return `https://colonist.io/dist/images/prob_${number}.svg?v168`
  
}

export const PlayerColor = {
  RED: "Red",
  BLUE: "Blue",
  GREEN: "Green"
}

export const PLAYER_COLORS = [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN]


export const PIECE_SVGS = (playerColor) =>{
  return {
      Settlement: `https://colonist.io/dist/images/settlement_${playerColor.toLowerCase()}.svg?v168`,
    City: `https://colonist.io/dist/images/city_${playerColor.toLowerCase()}.svg?v168`,
    Road: `https://colonist.io/dist/images/road_${playerColor.toLowerCase()}.svg?v168`,
  };
}


const playerColors = {
  0: "red",
  1: "blue",
};

const edgeTypes = {
  0: ""
}