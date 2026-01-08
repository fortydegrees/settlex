import { GridGenerator } from "react-hexgrid";
import { TileTypes } from "../types";

export type HexCoordinate = [number, number, number];

export function generateStandardHexes(shape: string, radius: number) {
  const gridHexes = GridGenerator[shape](radius);
  let idCounter = 0;

  return gridHexes.map((hex: { q: number; r: number; s: number }) => ({
    coordinate: [hex.q, hex.r, hex.s] as HexCoordinate,
    type: TileTypes.EMPTY,
    tile: {
      id: idCounter++
    }
  }));
}

export function getNumDots(rollNumber: number): number {
  if (rollNumber < 7) {
    return rollNumber - 1;
  }
  return 13 - rollNumber;
}
