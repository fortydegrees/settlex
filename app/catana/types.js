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
import { getPieceSvgPath } from "./theme/pieceAssets.js";



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
  "Wood": "/svgs/palette-themes/emoji/icon_wood.svg",
  "Brick": "/svgs/palette-themes/emoji/icon_brick.svg",
  "Sheep": "/svgs/palette-themes/emoji/icon_sheep.svg",
  "Wheat": "/svgs/palette-themes/emoji/icon_wheat.svg",
  "Ore": "/svgs/palette-themes/emoji/icon_ore.svg",
}

export const RESOURCE_SVGS = {
  "Wood": "/svgs/palette-themes/emoji/tile_lumber.svg",
  "Brick": "/svgs/palette-themes/emoji/tile_brick.svg",
  "Sheep": "/svgs/palette-themes/emoji/tile_wool.svg",
  "Wheat": "/svgs/palette-themes/emoji/tile_grain.svg",
  "Ore": "/svgs/palette-themes/emoji/tile_ore.svg",
  "Desert": "/svgs/palette-themes/emoji/tile_desert.svg",
  //"Ore": "/ore.svg",
  "Empty": '/empty.svg'
}

export const NUMBER_SVGS = (number) => {
  return `https://colonist.io/dist/images/prob_${number}.svg?v168`
  
}

export const PIECE_SVGS = (playerColor) =>{
  return {
      Settlement: getPieceSvgPath("settlement", playerColor),
    City: getPieceSvgPath("city", playerColor),
    Road: getPieceSvgPath("road", playerColor),
  };
}
