import type { HexCoordinate } from "./boardUtils";

const DIRS_CCW: HexCoordinate[] = [
  [0, 1, -1],
  [-1, 1, 0],
  [-1, 0, 1],
  [0, -1, 1],
  [1, -1, 0],
  [1, 0, -1]
];

const CORNERS: HexCoordinate[] = [
  [1, -1, 0],
  [0, -1, 1],
  [-1, 0, 1],
  [-1, 1, 0],
  [0, 1, -1],
  [1, 0, -1]
];

const add = (a: HexCoordinate, b: HexCoordinate): HexCoordinate => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2]
];

export function buildRing(radius: number, cornerIndex: number): HexCoordinate[] {
  const startCorner = CORNERS[cornerIndex];
  let pos: HexCoordinate = [
    startCorner[0] * radius,
    startCorner[1] * radius,
    startCorner[2] * radius
  ];
  const ring: HexCoordinate[] = [];
  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      ring.push(pos);
      pos = add(pos, DIRS_CCW[side]);
    }
  }
  return ring;
}

export function buildSpiralOrder(radius: number, cornerIndex: number): HexCoordinate[] {
  const order: HexCoordinate[] = [];
  for (let r = radius; r >= 1; r--) {
    order.push(...buildRing(r, cornerIndex));
  }
  order.push([0, 0, 0]);
  return order;
}
