export const ResourceType = {
  WOOD: "Wood",
  BRICK: "Brick",
  SHEEP: "Sheep",
  WHEAT: "Wheat",
  ORE: "Ore",
  DESERT: "Desert",
  GOLD: "Gold",
  WATER: "Water",
  EMPTY: "Empty",
  ANY: "Any"
} as const;

export type Resource = (typeof ResourceType)[keyof typeof ResourceType];

export const TileTypes = {
  LAND: "Land",
  PORT: "Port",
  WATER: "Water",
  EMPTY: "Empty"
} as const;

export const STANDARD_RESOURCES = [
  ResourceType.WOOD,
  ResourceType.BRICK,
  ResourceType.SHEEP,
  ResourceType.WHEAT,
  ResourceType.ORE
];

export const SPECIAL_TILES = [ResourceType.DESERT, ResourceType.EMPTY];

export const NodeBuildingTypes = {
  SETTLEMENT: "settlement",
  CITY: "city"
} as const;

export const EdgeBuildingTypes = {
  ROAD: 0,
  BOAT: 1
} as const;

export const PlayerColor = {
  RED: "Red",
  BLUE: "Blue",
  GREEN: "Green"
} as const;

export const PLAYER_COLORS = [
  PlayerColor.RED,
  PlayerColor.BLUE,
  PlayerColor.GREEN
];
