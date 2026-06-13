//import {spec} from './spec'
import { getNumDots } from "./boardUtils";
import {
  mean,
  pull,
  round,
  sortBy,
  sum,
  sumBy,
  countBy,
} from "lodash";
import { RandomQueue, RandomFn } from "../randomQueue";
import { STANDARD_RESOURCES, ResourceType, TileTypes } from "../types";
import { Board } from "./generateBoardClass";

import {
  findAllLowestBy,
  hasAll,
  sumByKey,
  findHighestBy,
  countMatches,
  findAllHighestBy,
} from "../collections";
const assert = require("assert");
//https://github.com/cgagliardi/settlers-setup/blob/master/src/app/board/strategy/strategy.ts

// When generating a board, several boards are generated, returning the best one. The number of
// boards generated is controlled by the constants below.
// At least MIN_ATTEMPTS boards are generated.
const MIN_ATTEMPTS = 30;
// Board generation runs for at least MIN_TIME milliesconds.
const MIN_TIME = 250;
// The first execution of board generation is substantially slower, so FIRST_MIN_TIME milliseconds
// is used on page load.
const FIRST_MIN_TIME = 400;

// This magic number is used to score hexes. A hex is scored as the sum of it's corner values,
// where each value is raised by this power. This number was found by trying several iterations of
// numbers to see which produced the optimal score.
const HEX_CORNER_POWER = 6;

let firstGenerated = false;

/**
 * These values allow us to generate boards with a specific numberDistribution.
 * Any time the algorithm is modified or new boards are added, this should be updated
 * with new values. To generate this list, call calculateStrategyScores() from
 * the browser console.
 */
const SCORE_RANGES = {
  standard4p: { greedy: 13.014067729766802, fair: 5.893507115912209 },
  // [BoardShape.EXPANSION6]: { greedy: 15.854644082031252, fair: 5.459049609374999 },
  // [BoardShape.SEAFARERS1]: { greedy: 22.19497916666667, fair: 7.765675357938958 },
  // [BoardShape.SEAFARERS2]: { greedy: 16.912793885030865, fair: 11.232163108710564 },
  // [BoardShape.DRAGONS]: { greedy: 22.21849821428571, fair: 11.630966830357144 },
};

function sampleWithRng(values, rng) {
  if (!values || values.length === 0) {
    return undefined;
  }
  const index = Math.floor(rng() * values.length);
  return values[index];
}

function createRandomQueueByPercent(percent, size, lowValue, highValue, rng) {
  const queue = new RandomQueue([], rng);
  const numHigh = Math.floor(percent * size);
  for (let i = 0; i < numHigh; i++) {
    queue.push(highValue);
  }
  for (let i = numHigh; i < size; i++) {
    queue.push(lowValue);
  }
  return queue;
}

export class BalancedBoard {
  rng: RandomFn;
  options: any;
  targetScore: number | null;
  desertPlacement: string;
  remainingHexes: any[];
  remainingNumbers: any[];
  remainingResources: RandomQueue<any> | null;
  board: any;
  initialResources: RandomQueue<any> | null;

  constructor(options, rng: RandomFn) {
    this.options = options;
    this.rng = rng;
    this.targetScore = null;
    this.desertPlacement = "Random";

    this.remainingHexes = [];
    this.remainingNumbers = [];
    this.remainingResources = null;
    this.board = null;
    this.initialResources = null;
    this.targetScore = null;
  }

  generateBoard(spec) {
    this.targetScore = this.calculateTargetScore(spec);
    this.desertPlacement = this.chooseDesertPlacement(spec);

    let bestBoard;
    let bestBoardScore = null;
    let bestBoardScoreStats;
    const startTime = Date.now();
    const minTime = firstGenerated ? MIN_TIME : FIRST_MIN_TIME;
    let i = 0;
    for (i = 0; i < MIN_ATTEMPTS || Date.now() - startTime < minTime; i++) {
      this.board = this.generateSingleBoard(spec);

      const [score, stats] = this.scoreBoard();
      if (this.isBetterScore(bestBoardScore, score)) {
        bestBoard = this.board;
        bestBoardScore = score;
        bestBoardScoreStats = stats;
      }
    }
    if (this.options?.logGenerationStats) {
      console.log("num boards generated: " + i);
      console.log("Target score: " + this.targetScore);
      console.log("Board score: " + bestBoardScore);
      console.log(bestBoardScoreStats);
    }

    firstGenerated = true;
    return { board: bestBoard, score: bestBoardScore };
  }

  scoreBoard() {
    // Compute the variance of the corner scores.
    this.scoreHexesAndCorners(true /* balanceCoastAndDesert */);
    const scores = Object.values(this.board.nodes as any).map((c: any) => c.score);
    const scoreMean = mean(scores);
    const scoreSum = sum(scores.map((s) => Math.pow(scoreMean - s, 2)));
    const variance = scoreSum / Object.keys(this.board.nodes).length;

    this.scoreHexesAndCorners(false /* balanceCoastAndDesert */);
    const highestCorner = (findHighestBy(
      Object.values(this.board.nodes as any),
      (c: any) => c.score
    ) as any).score;
    return [variance + (highestCorner - 10), { variance, highestCorner }];
  }

  isBetterScore(previous, next) {
    if (previous === null) {
      return true;
    }
    const previousDistance = Math.abs(previous - this.targetScore);
    const nextDistance = Math.abs(next - this.targetScore);
    return nextDistance < previousDistance;
  }

  generateSingleBoard(spec) {
    const board = new Board(spec, true, this.rng);


    // if (this.options.shufflePorts) {
    //   shufflePorts(board);
    // }

    // Place all of the resource hexes. This function can fail, so its run in a loop until it
    // succeeds. Place hexes also places a few roll numbers.
    do {
      this.remainingNumbers = sortBy(spec.rollNumbers(), (n) => getNumDots(n));
      this.remainingResources = new RandomQueue(spec.resources(), this.rng);
      this.initialResources = new RandomQueue(
        STANDARD_RESOURCES.filter((r) => this.remainingResources.includes(r)),
        this.rng
      );

      //reset all non-hex tiles board
      for (const hex of board.tiles) {
        if (hex.type !== "Port") {
          hex.type = "Empty";
          hex.tile.resource = null;
          hex.tile.number = null;
        }
      }
    } while (!this.placeHexes(board));

    this.board = board;
    this.remainingHexes = board.tiles.filter(
      (hex) => hex.tile.resource !== ResourceType.DESERT && hex.type === TileTypes.LAND && !hex.tile.number
    );
    //assert(this.remainingHexes.length === this.remainingNumbers.length);

    // Numbers are placed in order from best number to worst.
    // Start by placing the best available numbers on at least one of each resource type.
    // This is just to make sure there's at least 1 good number per resource.

    // Good numbers tend to naturally end up on the beach.
    // Ensure there's at least 1 good inland number.
    // if (!board.spec.allCoastalHexes) {
    //   const inlandHex = sample(this.remainingHexes.filter(h => !isCoastal(h)))!;
    //   inlandHex.rollNumber = this.remainingNumbers.pop()!;
    //   this.initialResources.remove(inlandHex.resource!);
    //   pull(this.remainingHexes, inlandHex);
    // }

    let resource;
    const numberStrategies = createRandomQueueByPercent(
        this.options.numberDistribution, this.remainingHexes.length,
        0, 1, this.rng);
    // tslint:disable-next-line:no-conditional-assignment
    while (resource = this.initialResources.pop()) {
      this.placeNumber(numberStrategies.pop(), resource);
    }

    // Place the remaining roll numbers until there are none left.
    while (this.remainingHexes.length) {
      this.placeNumber(numberStrategies.pop());
    }

    return board;
  }

  placeHexes(board) {
    // First place the desert.
    this.placeDesert(board);

    const resourceDistributionQueue = createRandomQueueByPercent(
      this.options.resourceDistribution,
      this.remainingResources.length,
      "Clumped",
      "Even",
      this.rng
    );

    // Next set the resources on hexes with typed ports such that they don't have their matching
    // resource.
    // if (!this.options.allowResourceOnPort) {
    //   const hexesWithTypedPorts =
    //       board.mutableHexes.filter(hex => !hex.resource && hex.getTypedPortResources().size);
    //   for (const hex of hexesWithTypedPorts) {
    //     const strategy = resourceDistributionQueue.pop();
    //     let possibleResources =
    //         this.remainingResources.vals.filter(r => !hex.getTypedPortResources().has(r));
    //     const neighborResources = hex.getNeighborResources().filter(r => r !== ResourceType.DESERT);
    //     if (neighborResources.length) {
    //       if (strategy === ResourceDistribution.CLUMPED) {
    //         const possible2 = possibleResources.filter(r => neighborResources.includes(r));
    //         if (possible2.length) {
    //           possibleResources = possible2;
    //         }
    //       } else {
    //         possibleResources = possibleResources.filter(r => !neighborResources.includes(r));
    //       }
    //     }
    //     if (!board.isResourceAllowed(hex, ResourceType.GOLD)) {
    //       possibleResources = possibleResources.filter(r => r !== ResourceType.GOLD);
    //     }
    //     const resource = sample(possibleResources);
    //     if (!resource) {
    //       return false;
    //     }
    //     hex.resource = resource;
    //     this.remainingResources.remove(hex.resource);
    //   }
    // }

    // Now set all remaining hexes at random, but without any of the same resources touching itself.
    // If we are unable to replace a hex without it touching the same resource type, return false
    // so that the function can be ran again on a new board.

    //this gets all current tiles on the board (that aren't 'required') that don't have a resource
    this.remainingHexes = board.tiles.filter((h) => !h.tile.resource);
    if(this.remainingHexes.length !== this.remainingResources.length){
      return false
    }
    let resourceDistribution;
    // tslint:disable-next-line:no-conditional-assignment
    while (resourceDistribution = resourceDistributionQueue.pop()) {
      let success;
      if (resourceDistribution === "Clumped") {
        success = this.placeResourceClumped(board);
      } else {
        success = this.placeResourceEven(board);
      }
      if (!success) {
        // Strategy failed.
        return false;
      }
     if (this.remainingHexes.length !== this.remainingResources.length){
      return false
     }
     if(this.remainingHexes.length !== resourceDistributionQueue.length){
      return false
     }
    }
    return true;
  }

  placeResourceClumped(board) {
    const availableResources = new Set(this.remainingResources.vals);
    const hasExistingResource =
      board.tiles.findIndex(
        (h) => h.tile.resource && availableResources.has(h.tile.resource)
      ) > -1;
    if (!hasExistingResource) {
      this.placeResourceRandom(board);
      return true;
    }
    // Find all of the hexes where we could place a clumped resource.

    const candidateHexes = this.remainingHexes.filter(
      (h) =>
        getNeighborTiles(h.coordinate, board).findIndex((n) =>
          availableResources.has(n.tile.resource)
        ) > -1
    );

    if (!candidateHexes.length) {
      return false;
    }
    const hex = sampleWithRng(candidateHexes, this.rng);
    if (!hex) {
      return false;
    }
    const neighborTiles = getNeighborTiles(hex.coordinate, board)
    if (!neighborTiles){
      return false;
    }
    const candidateResources = neighborTiles
      .filter((n) => availableResources.has(n.tile.resource))
      .map((n) => n.tile.resource);
    const resource = sampleWithRng(candidateResources, this.rng);
    if (!resource) {
      return false;
    }
    // isResourceAllowed is used to decide when gold is allowed. Here we assume that a gold resource
    // can always be placed next to another gold resource.
    //assert(board.isResourceAllowed(hex.resource, resource));
    hex.type = TileTypes.LAND
    hex.tile.resource = resource;
    this.remainingResources.remove(hex.tile.resource);
    pull(this.remainingHexes, hex);
    return true;
  }

  placeResourceEven(board) {
    const hex = this.remainingHexes.pop();
    const bannedResources = getNeighborResources(hex.coordinate, board);
    // Gold is only allowed on certain hexes.
    // if (!board.isResourceAllowed(hex, ResourceType.GOLD)) {
    //   bannedResources.push(ResourceType.GOLD);
    // }
    const resource = this.remainingResources.popExcluding(...bannedResources);
    if (!resource) {
      return false;
    }
    hex.type = TileTypes.LAND
    hex.tile.resource = resource;
    return true;
  }

  placeResourceRandom(board) {
    const hex = this.remainingHexes.pop();
    // const bannedResources =
    //     board.isResourceAllowed(hex, ResourceType.GOLD) ? [ResourceType.GOLD] : [];
    hex.type = TileTypes.LAND
    hex.tile.resource = this.remainingResources.popExcluding([]);
  }

  placeDesert(board) {
    // if (this.desertPlacement === "Center") {
    //   for (const hex of board.centerHexes) {
    //     this.remainingResources.remove(ResourceType.DESERT);
    //     hex.resource = ResourceType.DESERT;
    //   }
    //   assert(this.remainingResources.filterBy(ResourceType.DESERT).isEmpty());
    //   return;
    // }

    let availableHexes;
    availableHexes = board.tiles.filter((hex) => !hex.tile.resource);
    // switch (this.desertPlacement) {
    //   case DesertPlacement.RANDOM:
    //     // Don't put the desert on a hex that has a 2 typed ports.
    //     availableHexes = availableHexes.filter(hex => !has2TypedPorts(hex));
    //     break;

    //   case DesertPlacement.OFF_CENTER:
    //     const centerHexes = board.centerHexes;
    //     availableHexes = availableHexes.filter(hex =>
    //         !isCoastal(hex) && !centerHexes.includes(hex));
    //     break;

    //   case DesertPlacement.COAST:
    //     availableHexes = availableHexes.filter(hex =>
    //         isCoastal(hex) && !has2TypedPorts(hex));
    //     break;

    //   case DesertPlacement.INLAND:
    //     availableHexes = availableHexes.filter(hex => !isCoastal(hex));
    //     break;

    //   default:
    //     throw new Error('Unsupported desert placement: ' + this.desertPlacement);
    // }

    while (this.remainingResources.remove(ResourceType.DESERT)) {
      const hex = sampleWithRng(availableHexes, this.rng);
      if (!hex) {
        break;
      }
      hex.type = TileTypes.LAND;
      hex.tile.resource = ResourceType.DESERT;
      pull(availableHexes, hex);
    }
  }
  chooseDesertPlacement(spec) {
    if (
      this.options.desertPlacement === "Random" &&
      spec.name === "standard4p"
    ) {
      const rand = this.rng();
      if (rand < 0.2) {
        return "Center";
      } else if (rand < 0.6) {
        return "Coast";
      } else {
        return "Off Center";
      }
    } else {
      return this.options.desertPlacement;
    }
  }

  getHexes(node) {
    const newHoveredTiles = [];
    for (const tile of this.board.tiles) {
      if (Object.values(tile.tile.nodes).includes(parseInt(node))) {
        newHoveredTiles.push(tile);
      }
    }
    return newHoveredTiles;
  }

  placeNumber(numberStrategy, resourceType=null) {
    this.scoreHexesAndCorners();

    let potentialHexes = this.remainingHexes;
    if (resourceType) {
      potentialHexes = potentialHexes.filter(h => h.tile.resource === resourceType);
    }

    if (numberStrategy === 1) {
      potentialHexes = findAllLowestBy(potentialHexes, h => h.score);
    } else {
      potentialHexes = findAllHighestBy(potentialHexes, h => h.score);
    }
    const hex = sampleWithRng(potentialHexes, this.rng);
    if (!hex) {
      return;
    }
    pull(this.remainingHexes, hex);

    hex.tile.number = this.remainingNumbers.pop();
  }

  scoreHexesAndCorners(balanceCoastAndDesert = false) {
    // First score every corner by evaluating how good of a spot that specific corner is.
    for (const node of Object.keys(this.board.nodes)) {
      const hexes = this.getHexes(node);

      // Sum the value of each neighboring hex.
      let score = sumBy(
        hexes,
        (hex) =>
          this.getResourceValue(hex.tile.resource) *
          this.getRollNumValue(hex.tile.number, 0)
      );

      // If balanceCoastAndDesert is set, pretend like the corner always has 3 resourced hexes where
      // the rollNumber is a bad number.
      if (balanceCoastAndDesert) {
        const nonDesertHexes = hexes.filter(
          (h) => h.tile.resource !== ResourceType.DESERT
        );
        if (nonDesertHexes.length < 3) {
          score +=
            (3 - nonDesertHexes.length) *
            this.getResourceValue(ResourceType.BRICK) *
            this.getRollNumValue(2, 0);
        }
      }
      const notes = [];
      //TODO: probs uncomment this
      // if (corner.port) {
      //   if (this.options.allowResourceOnPort) {
      //     const matchingReourceHexes =
      //         corner.getHexes().filter(h => h.resource === corner.port.resource);
      //     if (matchingReourceHexes.length) {
      //       notes.push(['Has matching port']);
      //     }
      //     score += sum(
      //         matchingReourceHexes.map(hex => this.getRollNumValue(hex.rollNumber, 2) * 0.3));
      //   }
      //   notes.push(['Has port']);
      //   score += 3;
      // }

      // Look for any good combinations.
      const resourceOdds = this.computeRollOddsPerResource(hexes, 0);
      const addCombo = (name, multiplier, ...resources) => {
        if (hasAll(resourceOdds, ...resources)) {
          const addition =
            sumByKey(resourceOdds, ...resources) * 0.05 * multiplier;
          notes.push(name + " corner: " + round(addition, 2));
          score += addition;
        }
      };
      addCombo("City", 3, ResourceType.WHEAT, ResourceType.ORE);
      addCombo("Road", 2.5, ResourceType.BRICK, ResourceType.WOOD);
      //corner.notes = notes.join('\n');
      this.board.nodes[node].score = score;
    }

    for (const hex of this.board.tiles) {
      const tileNodes = Object.values(hex.tile.nodes as any) as Array<string | number>;
      const realNodes = [];
      for (const id of tileNodes) {
        realNodes.push(this.board.nodes[String(id)]);
      }

      const sumOfCorners = sumBy(realNodes, (corner) =>
        Math.pow(corner.score, HEX_CORNER_POWER)
      );
      hex.score = sumOfCorners;
    }
  }

  getResourceValue(resource) {
    assert(resource);
    switch (resource) {
      case ResourceType.DESERT:
      case ResourceType.WATER:
        return 0;
      case ResourceType.GOLD:
        return 1.2;
      default:
        return 1;
    }
  }
  getRollNumValue(rollNumber, missingValue = 0) {
    return rollNumber ? getNumDots(rollNumber) : missingValue;
  }

  computeRollOddsPerResource(hexes, defaultRollScore) {
    const map = new Map();
    for (const hex of hexes) {
      if (hex.tile.resource === ResourceType.DESERT) {
        continue;
      }
      let num = this.getRollNumValue(hex.tile.number, defaultRollScore);
      if (map.has(hex.tile.resource)) {
        num += map.get(hex.tile.resource);
      }
      map.set(hex.tile.resource, num);
    }
    return map;
  }

  calculateTargetScore(spec) {
    switch (this.options.numberDistribution) {
      case 1:
        return Number.MAX_VALUE;
      case 0:
        return 0;
      default:
        const range = SCORE_RANGES["standard4p"];
        if (!range) {
          console.error(`score range missing for "${spec.name}"`);
          return 0.5;
        }
        return (
          (1 - this.options.numberDistribution) * (range.greedy - range.fair) +
          range.fair
        );
    }
  }
}

const getTileByCoord = (coordinate, board) => {
  if (!board) return null
  return (
    board.tiles.find(
      (tile) => JSON.stringify(tile.coordinate) === JSON.stringify(coordinate)
    ) || null
  );
};

const getNeighborTiles = (coordinate, board) => {
  function add(acoord, bcoord) {
    const [x, y, z] = acoord;
    const [u, v, w] = bcoord;
    return [x + u, y + v, z + w];
  }

  const Direction = {
    EAST: "EAST",
    SOUTHEAST: "SOUTHEAST",
    SOUTHWEST: "SOUTHWEST",
    WEST: "WEST",
    NORTHWEST: "NORTHWEST",
    NORTHEAST: "NORTHEAST",
  };
  const UNIT_VECTORS = {
    [Direction.NORTHEAST]: [1, 0, -1],
    [Direction.SOUTHWEST]: [-1, 0, 1],
    [Direction.NORTHWEST]: [0, 1, -1],
    [Direction.SOUTHEAST]: [0, -1, 1],
    [Direction.EAST]: [1, -1, 0],
    [Direction.WEST]: [-1, 1, 0],
  };

  var neighborTiles = [];
  for (let dir of Object.keys(Direction)) {
    const neighborDirection = Direction[dir];
    const coord = add(coordinate, UNIT_VECTORS[neighborDirection]);
    const tile = getTileByCoord(coord, board);
    if (tile) {
      neighborTiles.push(tile);
    }
  }
  //console.log('nt', neighborTiles)
  return neighborTiles;
};

const getNeighborResources = (coordinate, board) => {
  const neighbors = getNeighborTiles(coordinate, board);
  if (neighbors && neighbors.length > 0) {
    return neighbors.map((h) => h.tile.resource).filter(defined);
  } else {
    return [];
  }
};

function defined(val) {
  return val !== null && val !== undefined;
}
// const placeHexes = (randomBoard, spec) => {
//   placeDesert(randomBoard, spec)
// }

// const placeDesert = (randomBoard, spec) => {
//   if (desertPlacement === "Center") {
//     for (const hex of spec.centerHexes) {
//       this.remainingResources.remove(ResourceType.DESERT);
//       hex.resource = ResourceType.DESERT;
//     }
//     assert(this.remainingResources.filterBy(ResourceType.DESERT).isEmpty());
//     return;
//   }

//   let availableHexes: Hex[];
//   availableHexes = board.mutableHexes.filter(hex => !hex.resource &&
//       board.isResourceAllowed(hex, ResourceType.DESERT));
//   switch (this.desertPlacement) {
//     case DesertPlacement.RANDOM:
//       // Don't put the desert on a hex that has a 2 typed ports.
//       availableHexes = availableHexes.filter(hex => !has2TypedPorts(hex));
//       break;

//     case DesertPlacement.OFF_CENTER:
//       const centerHexes = board.centerHexes;
//       availableHexes = availableHexes.filter(hex =>
//           !isCoastal(hex) && !centerHexes.includes(hex));
//       break;

//     case DesertPlacement.COAST:
//       availableHexes = availableHexes.filter(hex =>
//           isCoastal(hex) && !has2TypedPorts(hex));
//       break;

//     case DesertPlacement.INLAND:
//       availableHexes = availableHexes.filter(hex => !isCoastal(hex));
//       break;

//     default:
//       throw new Error('Unsupported desert placement: ' + this.desertPlacement);
//   }

//   while (this.remainingResources.remove(ResourceType.DESERT)) {
//     const hex = sample(availableHexes);
//     assert(hex);
//     hex.resource = ResourceType.DESERT;
//     pull(availableHexes, hex);
//   }
// }

// /**
//  * These values allow us to generate boards with a specific numberDistribution.
//  * Any time the algorithm is modified or new boards are added, this should be updated
//  * with new values. To generate this list, call calculateStrategyScores() from
//  * the browser console.
//  */
// const SCORE_RANGES = {
//     'standard4p': { greedy: 13.014067729766802, fair: 5.893507115912209 },
//     // [BoardShape.EXPANSION6]: { greedy: 15.854644082031252, fair: 5.459049609374999 },
//     // [BoardShape.SEAFARERS1]: { greedy: 22.19497916666667, fair: 7.765675357938958 },
//     // [BoardShape.SEAFARERS2]: { greedy: 16.912793885030865, fair: 11.232163108710564 },
//     // [BoardShape.DRAGONS]: { greedy: 22.21849821428571, fair: 11.630966830357144 },
//   };
