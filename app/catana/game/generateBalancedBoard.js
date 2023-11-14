//import {spec} from './spec'
import { generateBoard, getNumDots } from "./generateBoard";
import { mean, pull, round, sample, sortBy, sum, sumBy, countBy } from 'lodash-es';
import { RandomQueue } from "../utils/randomQueue";
import { STANDARD_RESOURCES, ResourceType, TileTypes } from "./types";
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
  "standard4p": { greedy: 13.014067729766802, fair: 5.893507115912209 },
  // [BoardShape.EXPANSION6]: { greedy: 15.854644082031252, fair: 5.459049609374999 },
  // [BoardShape.SEAFARERS1]: { greedy: 22.19497916666667, fair: 7.765675357938958 },
  // [BoardShape.SEAFARERS2]: { greedy: 16.912793885030865, fair: 11.232163108710564 },
  // [BoardShape.DRAGONS]: { greedy: 22.21849821428571, fair: 11.630966830357144 },
};

function createRandomQueueByPercent(
      percent, size, lowValue, highValue) {
  const queue = new RandomQueue();
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

  constructor(options){
    this.options = options
    this.targetScore = null
    this.desertPlacement =  "Random"

    this.remainingHexes = []
    this.remainingNumbers = []
    this.board = null
    this.initialResources = null
    this.targetScore = null
  }

  generateBoard (spec){
    this.targetScore = this.calculateTargetScore(spec)
    this.desertPlacement =  this.chooseDesertPlacement(spec)

    this.bestBoard;
    let bestBoardScore= null;
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
    console.log('num boards generated: ' + i);
    console.log('Target score: ' + this.targetScore);
    console.log('Board score: ' + bestBoardScore);
    console.log(bestBoardScoreStats);

    firstGenerated = true;
    return { board, score };
  }

  isBetterScore(previous,next){
    if (previous === null) {
      return true;
    }
    const previousDistance = Math.abs(previous - this.targetScore);
    const nextDistance = Math.abs(next - this.targetScore);
    return nextDistance < previousDistance;
  }

  scoreBoard(){
    
  }

  generateSingleBoard(spec){
    const board = generateBoard(spec, true)

    // if (this.options.shufflePorts) {
    //   shufflePorts(board);
    // }

    // Place all of the resource hexes. This function can fail, so its run in a loop until it
    // succeeds. Place hexes also places a few roll numbers.
    do {
      this.remainingNumbers = sortBy(spec.rollNumbers(), n => getNumDots(n));
      this.remainingResources = new RandomQueue(spec.resources());
      this.initialResources =
          new RandomQueue(STANDARD_RESOURCES.filter(r => this.remainingResources.includes(r)));

      //reset all non-hex tiles board
      for (const hex of board){
        if (hex.type !== 'Port'){
          hex.type = 'Empty'
          hex.tile.resource = null;
          hex.tile.number = null
        }
      }
    } while (!this.placeHexes(board));

    this.board = board;
    this.remainingHexes = board.filter(
        hex =>
            hex.tile.resource !== ResourceType.DESERT
            && !hex.tile.number);
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

    // let resource;
    // const numberStrategies = createRandomQueueByPercent(
    //     this.options.numberDistribution, this.remainingHexes.length,
    //     NumberPlacement.GREEDY, NumberPlacement.FAIR);
    // // tslint:disable-next-line:no-conditional-assignment
    // while (resource = this.initialResources.pop()) {
    //   this.placeNumber(numberStrategies.pop()!, resource);
    // }

    // // Place the remaining roll numbers until there are none left.
    // while (this.remainingHexes.length) {
    //   this.placeNumber(numberStrategies.pop()!);
    // }

    return board;
  }

  placeHexes(board){
      // First place the desert.
      this.placeDesert(board);

  
      const resourceDistributionQueue = createRandomQueueByPercent(this.options.resourceDistribution,
          this.remainingResources.length, 'Clumped', 'Even');
  
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
      this.remainingHexes = board.filter(h => !h.tile.resource);
      //assert(this.remainingHexes.length === this.remainingResources.length);
      let resourceDistribution
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
       // assert(this.remainingHexes.length === this.remainingResources.length);
        //assert(this.remainingHexes.length === resourceDistributionQueue.length);
      }
      return true;
    }

    placeResourceClumped(board) {
      const availableResources = new Set(this.remainingResources.vals);
      const hasExistingResource =
          board.findIndex(h => h.tile.resource && availableResources.has(h.tile.resource)) > -1;
      if (!hasExistingResource) {
        this.placeResourceRandom(board);
        return true;
      }
      // Find all of the hexes where we could place a clumped resource.
      const candidateHexes = this.remainingHexes.filter(h =>
          getNeighborTiles(h.coordinate, board).findIndex(n => availableResources.has(n.tile.resource)) > -1);
      if (!candidateHexes.length) {
        return false;
      }
      const hex = sample(candidateHexes);
      const candidateResources = getNeighborTiles(hex.coordinate).filter(n => availableResources.has(n.tile.resource)).map(n => n.tile.resource);
      const resource = sample(candidateResources);
      // isResourceAllowed is used to decide when gold is allowed. Here we assume that a gold resource
      // can always be placed next to another gold resource.
      //assert(board.isResourceAllowed(hex, resource));
      hex.resource = resource;
      this.remainingResources.remove(hex.resource);
      pull(this.remainingHexes, hex);
      return true;
    }

    placeResourceEven(board){
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
      hex.tile.resource = resource;
      return true;
    }
  
    placeResourceRandom(board) {
      const hex = this.remainingHexes.pop();
      // const bannedResources =
      //     board.isResourceAllowed(hex, ResourceType.GOLD) ? [ResourceType.GOLD] : [];
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
  
      let availableHexes
      availableHexes = board.filter(hex => !hex.tile.resource);
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
        const hex = sample(availableHexes);
        //assert(hex);
        hex.type = TileTypes.LAND
        hex.tile.resource = ResourceType.DESERT;
        pull(availableHexes, hex);
      }
    }
  chooseDesertPlacement(spec) {
    if (this.options.desertPlacement === "Random" &&
        spec.name === "standard4p") {
      const rand = Math.random();
      if (rand < 0.2) {
        return 'Center';
      } else if (rand < 0.6) {
        return 'Coast';
      } else {
        return 'Off Center';
      }
    } else {
      return this.options.desertPlacement;
    }
  }

calculateTargetScore() {
    switch (this.options.numberDistribution) {
      case 1:
        return Number.MAX_VALUE;
      case 0:
        return 0;
      default:
        const range = SCORE_RANGES[spec.name];
        if (!range) {
          console.error(`score range missing for "${spec.name}"`);
          return 0.5;
        }
        return (1 - this.options.numberDistribution) *
            (range.greedy - range.fair) + range.fair;
    }
  }


    
}


const getTileByCoord = (coordinate, board) => {
  return (
    board.find(
      (tile) => JSON.stringify(tile.coordinate) === JSON.stringify(coordinate)
    ) || null
  );
};

const getNeighborTiles = (coordinate, board) =>{
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
    const tile = getTileByCoord(coord, board)
    if (tile) {
      neighborTiles.push(tile);
    }
  }
  console.log('nt', neighborTiles)
  return neighborTiles
}

const getNeighborResources = (coordinate, board) =>{
  const neighbors = getNeighborTiles(coordinate,board)
  if (neighbors && neighbors.length > 0){
    return neighbors.map(h => h.tile.resource).filter(defined);
  }
  else{
    return []
  }
}

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

