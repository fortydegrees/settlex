import { GridGenerator } from "react-hexgrid";
import { RandomQueue } from "../utils/randomQueue";
import { ResourceType, TileTypes, STANDARD_RESOURCES } from "./types";

let idCounter = 0;

export const generateStandardHexes = (shape, radius) => {
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