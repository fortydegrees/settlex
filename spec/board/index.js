import {STANDARD} from './base'
import { HexGrid, Layout, Hexagon, Text, GridGenerator, HexUtils } from 'react-hexgrid';

export const ROLL_NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]

export const ResourceType = {
    ANY: 'Any', // Used for 3:1 ports.
    BRICK: 'Brick',
    DESERT: 'Desert',
    GOLD: 'Gold',
    ORE: 'Ore',
    SHEEP: 'Sheep',
    WATER: 'Water',
    WOOD: 'Wood',
    WHEAT: 'Wheat',
  };
  
  export const STANDARD_RESOURCES = [
    ResourceType.BRICK,
    ResourceType.ORE,
    ResourceType.SHEEP,
    ResourceType.WOOD,
    ResourceType.WHEAT,
  ];
  
  //get pips for number. works for d6.
  //essentially pips / 36 = prob. so pips = prob * (dice sides)^2
  export function getNumDots(rollNumber){
    if (rollNumber < 7) {
      return rollNumber - 1;
    } else {
      return 13 - rollNumber;
    }
  }

  export class Corner {
    score = null;
    notes = '';
  
    constructor(
        x,
      y,
        port,
        board) {}
  
    /**
     * @returns Hexes that touch the corner. Returns at most 3 values.
     */
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
    //resource= null;
    //rollNumber= null;
   //score= null;

    constructor(
        q,
        r,
        s,
        board) {}
  
    reset() {
      this.resource = null;
      this.rollNumber = null;
      this.score = null;
      this.typedPortResources = undefined;
    }
  
    /**
     * All neighboring hexes on the board.
     * TODO: make sure it works for hexgrid
     */
    // getNeighbors() {
    //   if (!this.neighbors) {
    //     this.neighbors = [
    //       this.board.getHex(this.x - 2, this.y),
    //       this.board.getHex(this.x + 2, this.y),
    //       this.board.getHex(this.x - 1, this.y - 1),
    //       this.board.getHex(this.x + 1, this.y - 1),
    //       this.board.getHex(this.x - 1, this.y + 1),
    //       this.board.getHex(this.x + 1, this.y + 1),
    //     ].filter(defined);
    //   }
    //   return this.neighbors;
    // }
  
    // getCorners() {
    //   if (!this.corners) {
    //     this.corners = [
    //       this.board.getCorner(this.x, this.y),
    //       this.board.getCorner(this.x + 1, this.y),
    //       this.board.getCorner(this.x + 2, this.y),
    //       this.board.getCorner(this.x, this.y + 1),
    //       this.board.getCorner(this.x + 1, this.y + 1),
    //       this.board.getCorner(this.x + 2, this.y + 1),
    //     ].filter(defined);;
    //   }
    //   return this.corners;
    // }
  
    // /**
    //  * Note: this function is lazy-cached, so if it's called before the board is initialized, it will
    //  * always return an incorrect value.
    //  * @returns The ResourceTypes of the neighboring ports with "ANY" removed from the results.
    //  */
    // getTypedPortResources() {
    //   if (this.typedPortResources === undefined) {
    //     const resources = this.getCorners()
    //         .filter(c => !!c.port && c.port.resource !== ResourceType.ANY)
    //         .map(c => c.port!.resource);
    //     this.typedPortResources = new Set(resources);
    //   }
    //   return this.typedPortResources;
    // }
  
    // /**
    //  * @returns The resource types of the neighboring hexes.
    //  */
    // getNeighborResources(){
    //   return this.getNeighbors().map(h => h.resource).filter(defined);
    // }
  
    hasCoordinate(coord) {
      return coord.q === this.q && coord.r === this.r && coord.s === this.s;
    }
  }

  //generateBoard() - creates and returns an array of Hex classes with co-ordinates


  export const generateBoard = (board) =>{
    //const { board } = this.config.strategy.generateBoard(this.config.spec);
    //generate a hex for all tiles with (x, y, board)
    //original function goes for each row/thing
    //values are from base.js spec
    //hexgrid catan uses boardRadius.. // https://codesandbox.io/s/catan-web-hnejo?file=/src/engine/boardHelpers.ts:1415-1464

    const gridHexes = GridGenerator[board.map](board.radius);


    let hexes = []
    for (let hex of gridHexes){
      hexes.push(new Hex(hex.q, hex.r, hex.s, board))
    }
  
    console.log(hexes)

    return hexes


    

    //so get the amount of hexes i need to gen.
  }

  export class Board {
    // readonly shape: BoardShape;
    // // So the BoardSpec for a description of what this value actually means.
    // readonly dimensions: Dimensions;
    // // Hexes represents all of the resource hexes on the board, where the indexes
    // // are what's documented in the Default Board Layout at the top of this file.
    // readonly hexGrid: HexGrid;
    // readonly cornerGrid: CornerGrid;
    // readonly ports: ReadonlyArray<Port>;
    // // Cached value for get hexes.
    // private flatHexes: ReadonlyArray<Hex>|undefined;
    // // Cached value fro get mutableHexes.
    // private cachedMutableHexes: ReadonlyArray<Hex>|undefined;
    // private cachedBeaches: ReadonlyArray<Beach>|undefined;
    // // Cached value for get corners.
    // private flatCorners: ReadonlyArray<Corner>|undefined;
    // // Coordinates are serialized using serializeCoordinate().
    // private requiredResourceCoordinates: Set<string>;
  
    constructor(spec) {
      this.spec = spec
      this.shape = spec.shape;
      this.dimensions = spec.dimensions;
      this.map = spec.map
      this.radius = spec.radius
      this.hexGrid = spec.hexes(this);


  
      this.requiredResourceCoordinates = new Set();
      for (const [resourceType, coordinatePairs] of spec.requiredResources) {
        for (let i = 0; i < coordinatePairs.length; i += 2) {
          this.requiredResourceCoordinates.add(
              serializeCoordinate(coordinatePairs[i], coordinatePairs[i + 1]));
        }
      }

      this.setRequiredResources();
  
      //this.ports = spec.ports()
      //this.cornerGrid = this.generateCornerGrid();
    }
  
    generateCornerGrid() {
      const corners = new Array(this.hexGrid.length + 1);
  
      for (let y = 0; y < corners.length; y++) {
        const [row1, row2] = this.getHexRowsForCornerRow(y);
        const numHexCols = row2 ? Math.max(row1.length, row2.length) : row1.length;
        const rowLen = numHexCols + 1;
        // The first index in hexes is also the first index in the corners column.
        const firstCol = findFirstSetIndex(row1, row2);
        corners[y] = new Array(rowLen);
        for (let x = firstCol; x < rowLen; x++) {
          const port =
              this.ports.find(p => p.corners.find(c => c.x === x && c.y === y)) || null;
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
      console.log(this)
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
        this.cachedMutableHexes = this.hexes.filter(hex => !this.isResourceImmutable(hex));
      }
      return this.cachedMutableHexes;
    }
  
    get centerHexes() {
      return this.spec.centerCoords.map(coord => this.getHex(coord.x, coord.y));
    }
  
    get corners() {
      if (!this.flatCorners) {
        this.flatCorners = flatten2dArray(this.cornerGrid);
      }
      return this.flatCorners;
    }
  
    get beaches(){
      if (!this.cachedBeaches) {
        const connections = this.spec.beachConnections;
        if (connections.length === 0) {
          this.cachedBeaches = [];
        } else {
          const beaches = new Array();
          try {
            beaches.push(
                this.createBeachFromConnections(connections[connections.length - 1], connections[0]));
          } catch (e) {
            console.error(e);
          }
          for (let i = 0; i < connections.length - 1; i++) {
            try {
              beaches.push(this.createBeachFromConnections(connections[i], connections[i + 1]));
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
      } ;
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
  
    /**
     * @param r An index in this.cornerGrid.
     * @returns The rows in hexes that are associated with the given row in this.cornerGrid[r].
     */
    getHexRowsForCornerRow(r) {
      if (r === 0) {
        return [this.hexGrid[0]];
      } else if (r === this.hexGrid.length) {
        return [this.hexGrid[this.hexGrid.length - 1]];
      } else {
        return [this.hexGrid[r - 1], this.hexGrid[r]];
      }
    }
  
    /**
     * @returns True if the hex is permitted to have the resource based on the type of game.
     */
    isResourceAllowed(hex, resource) {
      return this.spec.isResourceAllowed(hex, resource);
    }
  
    isResourceImmutable(hex) {
      return this.requiredResourceCoordinates.has(serializeCoordinate(hex.x, hex.y));
    }
  
    /**
     * Given the start and end coordinates that are beach corners, returns a list of all beach
     * coordinates from start to end inclusive.
     * This only works when start/end are along a straight line on the board.
     * Used to render the beaches of the board.
     */
    calculateBeachCorners(from, to, isSeafarersBeach) {
      if (isSeafarersBeach) {
        return this.generateSeafarersBeachCorners(from, to);
      }
  
      // This works by determining the x and y direction between from and to. Then it walks along
      // the board incrementing towards that direction and seeing if any such increment is a beach
      // corner. Because incrementing only x or y or both could be the next correct beach, it tries
      // all 3 combinations.
      // Appologies to those who have spent more time studying graph theory. This is just what I came
      // up with and it works for this limited problem set.
      const xDirection = to.x - from.x > 0 ? 1 : -1;
      const yDirection = from.y === to.y ? 0 : (to.y - from.y > 0 ? 1 : -1);
  
      const coords = [from];
  
      const tryBeachCorner = (coord) => {
        if (this.isBeachCorner(coord)) {
          coords.push(coord);
          prevCoord = coord;
          return true;
        }
        return false;
      };
  
      let prevCoord = from;
      while (prevCoord.x !== to.x || prevCoord.y !== to.y) {
        const tryXFirst = yDirection === 0 || prevCoord.x % 2 === 1;
        if (tryXFirst && tryBeachCorner({x: prevCoord.x + xDirection, y: prevCoord.y})) {
          continue;
        }
        if (yDirection !== 0) {
          if (tryBeachCorner({x: prevCoord.x, y: prevCoord.y + yDirection})) {
            continue;
          }
          if (!tryXFirst && tryBeachCorner({x: prevCoord.x + xDirection, y: prevCoord.y})) {
            continue;
          }
          if (tryBeachCorner({x: prevCoord.x + xDirection, y: prevCoord.y + yDirection})) {
            continue;
          }
        }
        throw new Error('Cannot find next coastal coordinate for beach.');
      }
      return coords;
    }
  
    /**
     * Generates the corners for the oddly shaped beach that comes with Seafarers. The shape is so
     * different than the other pieces, that the approach used above doesn't work and it's best just
     * to hard-code it.
     */
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
  
    /**
     * @returns True if the corner at coord is at the edge of the board.
     */
    isBeachCorner(coord) {
      const corner = this.getCorner(coord.x, coord.y);
      if (!corner) {
        return false;
      }
      return corner.getHexes().length <= 2;
    }
  }

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