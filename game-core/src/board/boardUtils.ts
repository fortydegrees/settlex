import { TileTypes } from "../types";
import type { BoardTile } from "../core/topology";

export type HexCoordinate = [number, number, number];

type Hex = { q: number; r: number; s: number };

const GridGenerator = {
  // Matches react-hexgrid ordering for hexagon grids.
  hexagon(mapRadius: number): Hex[] {
    const hexas: Hex[] = [];
    for (let q = -mapRadius; q <= mapRadius; q++) {
      const r1 = Math.max(-mapRadius, -q - mapRadius);
      const r2 = Math.min(mapRadius, -q + mapRadius);
      for (let r = r1; r <= r2; r++) {
        hexas.push({ q, r, s: -q - r });
      }
    }
    return hexas;
  }
} as const;

export function generateStandardHexes(shape: string, radius: number): BoardTile[] {
  const generator = GridGenerator[shape as keyof typeof GridGenerator];
  if (typeof generator !== "function") {
    throw new Error(`Unsupported grid shape: ${shape}`);
  }
  const gridHexes = generator(radius);
  let idCounter = 0;

  return gridHexes.map((hex: Hex): BoardTile => ({
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
