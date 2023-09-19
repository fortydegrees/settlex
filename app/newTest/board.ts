
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


  export class Hex {
    resource = null;
    rollNumber = null;
    score = null;
    location = null
    typedPortResources = undefined
  
    constructor(q, r, s) {
      this.location = {q,r,s}
    }
  
    reset() {
      this.resource = null;
      this.rollNumber = null;
      this.score = null;
      this.typedPortResources = undefined;
    }
  
    hasCoordinate(coord) {
      return coord.q === this.location.q && coord.r === this.location.r && coord.s === this.location.s;
    }
  }