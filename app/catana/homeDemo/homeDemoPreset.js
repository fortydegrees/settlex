import scenario from "../scenarios/new_dev_game.json";

const scenarioState = scenario.G;

export const HOME_DEMO_BOARD_PRESET = Object.freeze({
  id: "homepage-demo-standard",
  tiles: scenarioState.tiles,
  coreTopology: scenarioState.coreTopology,
  robberTileId: scenarioState.core?.robberTileId ?? null,
  initialPieces: Object.freeze({
    roadsByEdgeId: Object.freeze({}),
    buildingsByNodeId: Object.freeze({})
  })
});
