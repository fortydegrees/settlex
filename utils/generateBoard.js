

/*
BoardGen strats:
completey random
traditional e.g. the way it's meant to be
balanced e.g. settlerssetup.com
specific e.g. provide numbers & hexes
*/

/*
settings:
map size (3 is default)
resource distribution
dice distribution

want a system where we can import custom board shapes and all that
good data structure/layout: https://github.com/cgagliardi/settlers-setup/blob/master/src/app/board/board-specs.ts
*/

//lot of this stolen from:
//https://github.com/cgagliardi/settlers-setup/blob/master/src/app/board/board.ts


//do i kinda have to make this like [BoardShape.STANDARD] ? 
// const MAPS = {
//     "standard":{
//         size: 3,
//         shape: 'hex',
//         diceNums: DiceNumStrat.standard, //standard, random, custom
//         hexPlacement: HexPlacement.standard, //standard, random, balance
//     }
// }


export const ROLL_NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]

const ResourceType = {
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
  
  const STANDARD_RESOURCES = [
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


export const initEmptyTiles = (hexes, boardRadius) => {
    const tiles = {};
  
    hexes.forEach((hex) => {
      const id = HexUtils.getID(hex);
      // any tile outside of the board radius will be considered the offset,
      // only if it is part of the immediate border. Further tiles will throw.
      const largestCoord = Math.max(...[hex.q, hex.r, hex.s].map(Math.abs));
  
      if (largestCoord < boardRadius + 1) {
        tiles[id] = new Tile(id);
      } else if (largestCoord === boardRadius + 1) {
        tiles[id] = new OffsetTile(id);
      } else {
        throw new Error(
          'Unexpected hexagons outside the offset ring, got coord:' + id
        );
      }
    });
  
    return tiles;
  }