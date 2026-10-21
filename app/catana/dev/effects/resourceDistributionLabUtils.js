const DEMO_COORDINATES = [
  [0, 0, 0],
  [1, -1, 0],
  [0, 1, -1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 1, 0]
];

const DEMO_RESOURCES = ["Wood", "Brick", "Sheep", "Wheat", "Ore"];
const DEMO_PLAYERS = ["0", "1"];

export function buildResourceDistributionDemo({ count = 3, random = Math.random } = {}) {
  return Array.from({ length: count }, (_, index) => {
    const coordinate = DEMO_COORDINATES[Math.floor(random() * DEMO_COORDINATES.length)];
    const resource = DEMO_RESOURCES[Math.floor(random() * DEMO_RESOURCES.length)];
    const playerID = DEMO_PLAYERS[Math.floor(random() * DEMO_PLAYERS.length)];
    return {
      tileId: index + 1,
      coordinate,
      playerID,
      resource
    };
  });
}
