/**
 * @fileoverview This file defines the various enums, type definitions and interfaces needed to
 * define a Settlers board (BoardSpec). Additionaly, this file provides the Board class, which a
 * Strategy manipulates to fill a board and the UI reads to render the board.
 */
import { defined } from "../util/collections";
import { BoardShape } from "./specs/shapes-enum";
import { ResourceType, STANDARD_RESOURCES } from "./types";

const ROLL_NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

// function serializeCoordinate(x, y){
//   return x + '-' + y;
// }

/**
 * Given the number of a roll, returns the number of dots that appear on that roll number.
 * The probability of the roll is this value / 36.
 */
export function getNumDots(rollNumber) {
  if (rollNumber < 7) {
    return rollNumber - 1;
  } else {
    return 13 - rollNumber;
  }
}

/**
 * BoardSpec defines a specific settlers of catan board such that a setup strategy can be built from
 * it.
 *
 * The indexes of the HexGrid 2d array are demonstrated below.
 * Default Board Layout
 *    012345678
 * 0    2 4 6
 * 1   1 3 5 7
 * 2  0 2 4 6 8
 * 3   1 3 5 7
 * 4    2 4 6
 *
 * Expansion 5-6 Board Layout
 *    01234567890
 * 0     3 5 7
 * 1    2 4 6 8
 * 2   1 3 5 7 9
 * 3  0 2 4 6 8 0
 * 4   1 3 5 7 9
 * 5    2 4 6 8
 * 6     3 5 7
 */

/**
 * A corner represents the intersection of hexes and the catan beach.
 * The coordinates are represented on a separate system from the hex coordinates.
 * For a Catan board that has only a single hex, the corner coordinates for that board are as
 * follows:
 * NW: 0,0
 * N:  1,0
 * NE: 2,0
 * SW: 0,1
 * S:  1,1
 * SE: 2,1
 *
 * Although in the real world, the N corner is higher than NW and NE, here we collapse them into a
 * single row.
 *
 * Unlike the Hexes, we have no gaps in numbers in the corner coordinate system
 */

class Node {
  constructor(x, y, port, board) {
    //do they need co-ords? do they need tileIDs? how do we initialise this? can we initialise after generating tiles?
    //can we just have Hexes/Tiles?
    this.x = x; 
    this.y = y;
    this.port = port;
    this.board = board;
    this.score = null;
    this.building = null;
  }

//TODO
  getHexes() {
    // Hex rows at are [y, y-1]
    // For columns, use [x-2, x-1, x]
    // We'll never actually return 6 values, since hex values alternate on columns.
    return [
      this.board.getHex(this.x - 2, this.y - 1),
      this.board.getHex(this.x - 1, this.y - 1),
      this.board.getHex(this.x, this.y - 1),
      this.board.getHex(this.x - 2, this.y),
      this.board.getHex(this.x - 1, this.y),
      this.board.getHex(this.x, this.y),
    ].filter(defined);
  }
}

export class Hex {
  constructor(coordinate, board) {
    this.coordinate
    this.board = board;
    this.resource = null;
    this.rollNumber = null;
    this.score = null;
    this.typedPortResources = undefined;
    this.neighbors = undefined;
    this.corners = undefined;
  }

  reset() {
    this.resource = null;
    this.rollNumber = null;
    this.score = null;
    this.typedPortResources = undefined;
  }

  //TODO:
  getNeighbors() {
    if (!this.neighbors) {
      this.neighbors = [
        this.board.getHex(this.x - 2, this.y),
        this.board.getHex(this.x + 2, this.y),
        this.board.getHex(this.x - 1, this.y - 1),
        this.board.getHex(this.x + 1, this.y - 1),
        this.board.getHex(this.x - 1, this.y + 1),
        this.board.getHex(this.x + 1, this.y + 1),
      ].filter(defined);
    }
    return this.neighbors;
  }

  //TODO:
  getCorners() {
    if (!this.corners) {
      this.corners = [
        this.board.getCorner(this.x, this.y),
        this.board.getCorner(this.x + 1, this.y),
        this.board.getCorner(this.x + 2, this.y),
        this.board.getCorner(this.x, this.y + 1),
        this.board.getCorner(this.x + 1, this.y + 1),
        this.board.getCorner(this.x + 2, this.y + 1),
      ].filter(defined);
    }
    return this.corners;
  }

  getTypedPortResources() {
    if (this.typedPortResources === undefined) {
      const resources = this.getCorners()
        .filter((c) => !!c.port && c.port.resource !== ResourceType.ANY)
        .map((c) => c.port.resource);
      this.typedPortResources = new Set(resources);
    }
    return this.typedPortResources;
  }

  getNeighborResources() {
    return this.getNeighbors()
      .map((h) => h.resource)
      .filter(defined);
  }

  hasCoordinate(coord) {
    return coord.x === this.x && coord.y === this.y;
  }
}

export class Board {
  constructor(spec) {
    this.shape = spec.shape;
    this.radius = spec.radius

    this.hexGrid = spec.hexes(this);

    this.requiredResourceCoordinates = new Set();
    for (const [resourceType, coordinatePairs] of spec.requiredResources) {
      for (let i = 0; i < coordinatePairs.length; i += 2) {
        this.requiredResourceCoordinates.add(
          serializeCoordinate(coordinatePairs[i], coordinatePairs[i + 1])
        );
      }
    }
    this.setRequiredResources();

    this.ports = spec.ports();
    this.cornerGrid = this.generateCornerGrid();
  }

  generateCornerGrid() {
    const corners = new Array(this.hexGrid.length + 1);

    for (let y = 0; y < corners.length; y++) {
      const [row1, row2] = this.getHexRowsForCornerRow(y);
      const numHexCols = row2
        ? Math.max(row1.length, row2.length)
        : row1.length;
      const rowLen = numHexCols + 1;
      const firstCol = findFirstSetIndex(row1, row2);
      corners[y] = new Array(rowLen);
      for (let x = firstCol; x < rowLen; x++) {
        const port =
          this.ports.find((p) =>
            p.corners.find((c) => c.x === x && c.y === y)
          ) || null;
        corners[y][x] = new Corner(x, y, port, this);
      }
    }
    return corners;
  }

  reset() {
    for (const hex of this.hexes) {
      hex.reset();
    }
    this.setRequiredResources();
  }

  setRequiredResources() {
    for (const [resourceType, coordinatePairs] of this.spec.requiredResources) {
      for (let i = 0; i < coordinatePairs.length; i += 2) {
        const x = coordinatePairs[i];
        const y = coordinatePairs[i + 1];
        this.getHex(x, y).resource = resourceType;
      }
    }
  }

  get hexes() {
    if (!this.flatHexes) {
      this.flatHexes = flatten2dArray(this.hexGrid);
    }
    return this.flatHexes;
  }

  get mutableHexes() {
    if (!this.cachedMutableHexes) {
      this.cachedMutableHexes = this.hexes.filter(
        (hex) => !this.isResourceImmutable(hex)
      );
    }
    return this.cachedMutableHexes;
  }

  get centerHexes() {
    return this.spec.centerCoords.map((coord) => this.getHex(coord.x, coord.y));
  }

  get corners() {
    if (!this.flatCorners) {
      this.flatCorners = flatten2dArray(this.cornerGrid);
    }
    return this.flatCorners;
  }

  get beaches() {
    if (!this.cachedBeaches) {
      const connections = this.spec.beachConnections;
      if (connections.length === 0) {
        this.cachedBeaches = [];
      } else {
        const beaches = [];
        try {
          beaches.push(
            this.createBeachFromConnections(
              connections[connections.length - 1],
              connections[0]
            )
          );
        } catch (e) {
          console.error(e);
        }
        for (let i = 0; i < connections.length - 1; i++) {
          try {
            beaches.push(
              this.createBeachFromConnections(
                connections[i],
                connections[i + 1]
              )
            );
          } catch (e) {
            console.error(e);
          }
        }
        this.cachedBeaches = beaches;
      }
    }
    return this.cachedBeaches;
  }

  createBeachFromConnections(from, to) {
    const isSeafarersBeach = from.x === to.x && Math.abs(from.y - to.y) === 2;
    const beach = {
      corners: this.calculateBeachCorners(from, to, isSeafarersBeach),
      isSeafarersBeach,
    };
    if (from.label && to.label) {
      beach.labels = [from.label, to.label];
    }
    return beach;
  }

  getHex(x, y) {
    return getFrom2dArray(this.hexGrid, x, y);
  }

  getCorner(x, y) {
    return getFrom2dArray(this.cornerGrid, x, y);
  }

  getHexRowsForCornerRow(r) {
    if (r === 0) {
      return [this.hexGrid[0]];
    } else if (r === this.hexGrid.length) {
      return [this.hexGrid[this.hexGrid.length - 1]];
    } else {
      return [this.hexGrid[r - 1], this.hexGrid[r]];
    }
  }
  isResourceAllowed(hex, resource) {
    return this.spec.isResourceAllowed(hex, resource);
  }

  isResourceImmutable(hex) {
    return this.requiredResourceCoordinates.has(
      serializeCoordinate(hex.x, hex.y)
    );
  }

  calculateBeachCorners(from, to, isSeafarersBeach) {
    if (isSeafarersBeach) {
      return this.generateSeafarersBeachCorners(from, to);
    }

    const xDirection = to.x - from.x > 0 ? 1 : -1;
    const yDirection = from.y === to.y ? 0 : to.y - from.y > 0 ? 1 : -1;
    const coords = [from];
    let prevCoord = from;

    while (prevCoord.x !== to.x || prevCoord.y !== to.y) {
      const tryXFirst = yDirection === 0 || prevCoord.x % 2 === 1;

      const tryBeachCorner = (coord) => {
        if (this.isBeachCorner(coord)) {
          coords.push(coord);
          prevCoord = coord;
          return true;
        }
        return false;
      };

      if (
        tryXFirst &&
        tryBeachCorner({ x: prevCoord.x + xDirection, y: prevCoord.y })
      ) {
        continue;
      }
      if (yDirection !== 0) {
        if (tryBeachCorner({ x: prevCoord.x, y: prevCoord.y + yDirection })) {
          continue;
        }
        if (
          !tryXFirst &&
          tryBeachCorner({ x: prevCoord.x + xDirection, y: prevCoord.y })
        ) {
          continue;
        }
        if (
          tryBeachCorner({
            x: prevCoord.x + xDirection,
            y: prevCoord.y + yDirection,
          })
        ) {
          continue;
        }
      }
      throw new Error("Cannot find next coastal coordinate for beach.");
    }
    return coords;
  }

  generateSeafarersBeachCorners(from, to) {
    const yDir = from.y > to.y ? -1 : 1;
    const xDir = yDir === 1 ? -1 : 1;
    return [
      from,
      { x: from.x + xDir, y: from.y },
      { x: from.x + xDir, y: from.y + yDir },
      { x: from.x, y: from.y + yDir },
      to,
    ];
  }

  isBeachCorner(coord) {
    const corner = this.getCorner(coord.x, coord.y);
    if (!corner) {
      return false;
    }
    return corner.getHexes().length <= 2;
  }
}

/**
 * Given 2 arrays (or maybe just 1), return the index of the first defined value in either array.
 * Returns -1 if no such value exists.
 */
function findFirstSetIndex(arr1, arr2) {
  const index1 = arr1.findIndex(defined);
  if (!arr2) {
    return index1;
  }
  const index2 = arr2.findIndex(defined);
  if (index1 === -1) {
    return index2;
  }
  if (index2 === -1) {
    return index1;
  }
  return Math.min(index1, index2);
}

function getFrom2dArray(arr, x, y) {
  if (y < 0 || y >= arr.length) {
    return undefined;
  }
  return arr[y][x];
}

/**
 * Given a partially filled 2d array, returns a flat list of all truthy values.
 */
function flatten2dArray(grid) {
  const arr = [];
  for (const row of grid) {
    for (const cell of row) {
      if (cell) {
        arr.push(cell);
      }
    }
  }
  return arr;
}
