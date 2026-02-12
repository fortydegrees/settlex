export {
  ResourceType,
  TileTypes,
  STANDARD_RESOURCES,
  SPECIAL_TILES,
  NodeBuildingTypes,
  EdgeBuildingTypes,
  PlayerColor,
  PLAYER_COLORS
} from "@settlex/game-core";



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
  "Wood": "/svgs/tile_lumber.svg",
  "Brick": "/svgs/tile_brick.svg",
  "Sheep": "/svgs/tile_wool.svg",
  "Wheat": "/svgs/tile_grain.svg",
  "Ore": "/svgs/tile_ore.svg",
  "Desert": "/svgs/tile_desert.svg",
  //"Ore": "/ore.svg",
  "Empty": '/empty.svg'
}

export const NUMBER_SVGS = (number) => {
  return `https://colonist.io/dist/images/prob_${number}.svg?v168`
  
}

export const PIECE_SVGS = (playerColor) =>{
  return {
      Settlement: `https://colonist.io/dist/images/settlement_${playerColor.toLowerCase()}.svg?v168`,
    City: `https://colonist.io/dist/images/city_${playerColor.toLowerCase()}.svg?v168`,
    Road: `https://colonist.io/dist/images/road_${playerColor.toLowerCase()}.svg?v168`,
  };
}
