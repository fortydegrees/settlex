import { generateHomeDemoProceduralEvents } from "./homeDemoProceduralScene";

export const HOME_DEMO_PLAYERS = Object.freeze([
  { id: "home-blue", color: "royal" },
  { id: "home-red", color: "red" },
  { id: "home-green", color: "green" },
  { id: "home-orange", color: "orange" }
]);

export const HOME_DEMO_PLAYER_COLORS = Object.freeze(
  Object.fromEntries(
    HOME_DEMO_PLAYERS.map((player) => [player.id, player.color])
  )
);

export const HOME_DEMO_CONFIG = Object.freeze({
  playerCount: 4,
  maxCommittedPieces: 10,
  resetHoldMs: 2200,
  sceneSetupHoldMs: 450,
  commitLeadMs: 90,
  sequenceMode: "curated-scenes",
  allowHeroCityDrop: true
});

const HOME_DEMO_SCENE_SETUP_TIMING = Object.freeze({
  initialDelayMs: 120,
  staggerMs: 115,
  startFrom: "viewport-top"
});

const EMPTY_INITIAL_PIECES = Object.freeze({
  roadsByEdgeId: Object.freeze({}),
  buildingsByNodeId: Object.freeze({})
});

const makeInitialPieces = ({ roads = [], buildings = [] } = {}) =>
  Object.freeze({
    roadsByEdgeId: Object.freeze(
      Object.fromEntries(
        roads.map(({ edgeId, playerId }) => [edgeId, { edgeId, playerId }])
      )
    ),
    buildingsByNodeId: Object.freeze(
      Object.fromEntries(
        buildings.map(({ nodeId, playerId, type = "settlement" }) => [
          nodeId,
          { nodeId, playerId, type }
        ])
      )
    )
  });

export const HOME_DEMO_SCENES = Object.freeze([
  Object.freeze({
    id: "quiet-expansion",
    mode: "procedural",
    durationMs: 64000,
    initialPieces: makeInitialPieces({
      roads: [
        { edgeId: "29,32", playerId: "home-blue" },
        { edgeId: "38,39", playerId: "home-red" },
        { edgeId: "11,20", playerId: "home-green" }
      ],
      buildings: [
        { nodeId: 32, playerId: "home-blue" },
        { nodeId: 38, playerId: "home-red" },
        { nodeId: 20, playerId: "home-green" }
      ]
    }),
    procedural: Object.freeze({
      seed: "quiet-expansion",
      playerIds: Object.freeze(["home-blue", "home-red", "home-green"]),
      maxMoves: 48,
      delayMs: Object.freeze([1000, 4000]),
      minCityMoveIndex: 8,
      minCities: 2,
      maxCities: 2,
      streakChance: 0.28,
      balanceTolerance: 3,
      weights: Object.freeze({
        road: 0.6,
        settlement: 0.3,
        city: 0.1
      })
    })
  }),
  Object.freeze({
    id: "coastal-duel",
    mode: "procedural",
    durationMs: 58000,
    initialPieces: makeInitialPieces({
      roads: [
        { edgeId: "6,9", playerId: "home-blue" },
        { edgeId: "50,53", playerId: "home-red" }
      ],
      buildings: [
        { nodeId: 9, playerId: "home-blue" },
        { nodeId: 50, playerId: "home-red" }
      ]
    }),
    procedural: Object.freeze({
      seed: "coastal-duel",
      playerIds: Object.freeze(["home-blue", "home-red"]),
      maxMoves: 34,
      delayMs: Object.freeze([1300, 3600]),
      minCityMoveIndex: 6,
      minCities: 1,
      maxCities: 2,
      streakChance: 0.2,
      balanceTolerance: 2,
      weights: Object.freeze({
        road: 0.56,
        settlement: 0.32,
        city: 0.12
      })
    })
  }),
  Object.freeze({
    id: "normal-duel-openings",
    mode: "procedural",
    durationMs: 62000,
    initialPieces: makeInitialPieces({
      roads: [
        { edgeId: "11,20", playerId: "home-blue" },
        { edgeId: "25,30", playerId: "home-blue" },
        { edgeId: "23,33", playerId: "home-red" },
        { edgeId: "34,43", playerId: "home-red" }
      ],
      buildings: [
        { nodeId: 11, playerId: "home-blue" },
        { nodeId: 25, playerId: "home-blue" },
        { nodeId: 23, playerId: "home-red" },
        { nodeId: 34, playerId: "home-red" }
      ]
    }),
    procedural: Object.freeze({
      seed: "normal-duel-openings",
      playerIds: Object.freeze(["home-blue", "home-red"]),
      maxMoves: 36,
      delayMs: Object.freeze([1300, 3600]),
      minCityMoveIndex: 6,
      minCities: 1,
      maxCities: 2,
      streakChance: 0.18,
      balanceTolerance: 2,
      weights: Object.freeze({
        road: 0.56,
        settlement: 0.32,
        city: 0.12
      })
    })
  }),
  Object.freeze({
    id: "ridge-duel-openings",
    mode: "procedural",
    durationMs: 60000,
    initialPieces: makeInitialPieces({
      roads: [
        { edgeId: "6,9", playerId: "home-blue" },
        { edgeId: "33,36", playerId: "home-blue" },
        { edgeId: "15,25", playerId: "home-red" },
        { edgeId: "41,44", playerId: "home-red" }
      ],
      buildings: [
        { nodeId: 6, playerId: "home-blue" },
        { nodeId: 33, playerId: "home-blue" },
        { nodeId: 15, playerId: "home-red" },
        { nodeId: 41, playerId: "home-red" }
      ]
    }),
    procedural: Object.freeze({
      seed: "ridge-duel-openings",
      playerIds: Object.freeze(["home-blue", "home-red"]),
      maxMoves: 34,
      delayMs: Object.freeze([1400, 3800]),
      minCityMoveIndex: 6,
      minCities: 1,
      maxCities: 2,
      streakChance: 0.18,
      balanceTolerance: 2,
      weights: Object.freeze({
        road: 0.58,
        settlement: 0.3,
        city: 0.12
      })
    })
  }),
  Object.freeze({
    id: "four-corner-spread",
    mode: "procedural",
    durationMs: 62000,
    initialPieces: makeInitialPieces({
      roads: [
        { edgeId: "6,9", playerId: "home-blue" },
        { edgeId: "25,30", playerId: "home-red" },
        { edgeId: "47,51", playerId: "home-green" },
        { edgeId: "52,53", playerId: "home-orange" }
      ],
      buildings: [
        { nodeId: 6, playerId: "home-blue" },
        { nodeId: 25, playerId: "home-red" },
        { nodeId: 47, playerId: "home-green" },
        { nodeId: 52, playerId: "home-orange" }
      ]
    }),
    procedural: Object.freeze({
      seed: "four-corner-spread",
      playerIds: Object.freeze(HOME_DEMO_PLAYERS.map((player) => player.id)),
      maxMoves: 42,
      delayMs: Object.freeze([1200, 3800]),
      minCityMoveIndex: 8,
      minCities: 2,
      maxCities: 2,
      streakChance: 0.22,
      balanceTolerance: 3,
      weights: Object.freeze({
        road: 0.58,
        settlement: 0.32,
        city: 0.1
      })
    })
  }),
  Object.freeze({
    id: "gentle-city",
    durationMs: 60000,
    initialPieces: makeInitialPieces({
      roads: [
        { edgeId: "38,39", playerId: "home-orange" },
        { edgeId: "29,32", playerId: "home-blue" },
        { edgeId: "11,20", playerId: "home-green" }
      ],
      buildings: [
        { nodeId: 38, playerId: "home-orange" },
        { nodeId: 32, playerId: "home-blue" },
        { nodeId: 20, playerId: "home-green" }
      ]
    }),
    events: Object.freeze([
      {
        id: "city-orange-upgrade",
        type: "place-city",
        playerId: "home-orange",
        target: { nodeId: 38 },
        atMs: 3200
      },
      {
        id: "city-green-road-1",
        type: "place-road",
        playerId: "home-green",
        target: { edgeId: "20,23" },
        atMs: 7800
      },
      {
        id: "city-green-road-2",
        type: "place-road",
        playerId: "home-green",
        target: { edgeId: "23,33" },
        atMs: 12300
      },
      {
        id: "city-green-settlement",
        type: "place-settlement",
        playerId: "home-green",
        target: { nodeId: 33 },
        atMs: 16600
      },
      {
        id: "city-blue-road-1",
        type: "place-road",
        playerId: "home-blue",
        target: { edgeId: "32,41" },
        atMs: 21900
      },
      {
        id: "city-blue-road-2",
        type: "place-road",
        playerId: "home-blue",
        target: { edgeId: "41,44" },
        atMs: 24600
      },
      {
        id: "city-blue-settlement",
        type: "place-settlement",
        playerId: "home-blue",
        target: { nodeId: 44 },
        atMs: 27300
      },
      {
        id: "city-orange-road-1",
        type: "place-road",
        playerId: "home-orange",
        target: { edgeId: "38,42" },
        atMs: 31800
      },
      {
        id: "city-orange-road-2",
        type: "place-road",
        playerId: "home-orange",
        target: { edgeId: "42,47" },
        atMs: 36900
      },
      {
        id: "city-orange-settlement",
        type: "place-settlement",
        playerId: "home-orange",
        target: { nodeId: 47 },
        atMs: 41400
      },
      {
        id: "city-green-road-3",
        type: "place-road",
        playerId: "home-green",
        target: { edgeId: "33,36" },
        atMs: 46200
      },
      {
        id: "city-green-road-4",
        type: "place-road",
        playerId: "home-green",
        target: { edgeId: "36,45" },
        atMs: 50600
      },
      {
        id: "city-green-settlement-2",
        type: "place-settlement",
        playerId: "home-green",
        target: { nodeId: 45 },
        atMs: 54800
      },
      {
        id: "city-blue-upgrade",
        type: "place-city",
        playerId: "home-blue",
        target: { nodeId: 44 },
        atMs: 58400
      }
    ])
  })
]);

export function getHomeDemoSceneEvents(scene, options = {}) {
  if (scene?.mode === "procedural") {
    return generateHomeDemoProceduralEvents(scene, options);
  }
  return scene?.events ?? [];
}

export const HOME_DEMO_EVENTS = getHomeDemoSceneEvents(HOME_DEMO_SCENES[0]);

function getHomeDemoPlayerSortIndex(playerId) {
  const playerIndex = HOME_DEMO_PLAYERS.findIndex((player) => player.id === playerId);
  return playerIndex === -1 ? Number.MAX_SAFE_INTEGER : playerIndex;
}

function compareHomeDemoSetupPieces(a, b) {
  const playerDiff =
    getHomeDemoPlayerSortIndex(a.playerId) - getHomeDemoPlayerSortIndex(b.playerId);
  if (playerDiff !== 0) return playerDiff;

  const typeDiff = a.typeOrder - b.typeOrder;
  if (typeDiff !== 0) return typeDiff;

  return String(a.sortId).localeCompare(String(b.sortId), undefined, {
    numeric: true
  });
}

export function getHomeDemoSceneSetupEvents(scene) {
  const initialPieces = scene?.initialPieces;
  const setupPieces = [
    ...Object.values(initialPieces?.buildingsByNodeId ?? {}).map((building) => ({
      eventType: building.type === "city" ? "place-city" : "place-settlement",
      idPart: String(building.nodeId),
      playerId: building.playerId,
      sortId: building.nodeId,
      target: { nodeId: building.nodeId },
      typeOrder: 0
    })),
    ...Object.values(initialPieces?.roadsByEdgeId ?? {}).map((road) => ({
      eventType: "place-road",
      idPart: String(road.edgeId).replace(/,/g, "-"),
      playerId: road.playerId,
      sortId: road.edgeId,
      target: { edgeId: road.edgeId },
      typeOrder: 1
    }))
  ].sort(compareHomeDemoSetupPieces);

  return setupPieces.map((piece, index) => ({
    id: `${scene?.id ?? "home-demo"}-setup-${piece.idPart}`,
    type: piece.eventType,
    playerId: piece.playerId,
    target: piece.target,
    atMs:
      HOME_DEMO_SCENE_SETUP_TIMING.initialDelayMs +
      index * HOME_DEMO_SCENE_SETUP_TIMING.staggerMs,
    setupPhase: true,
    startFrom: HOME_DEMO_SCENE_SETUP_TIMING.startFrom
  }));
}

export function createHomeDemoPieceState(initialPieces = EMPTY_INITIAL_PIECES) {
  return {
    roadsByEdgeId: Object.fromEntries(
      Object.entries(initialPieces?.roadsByEdgeId ?? {}).map(([edgeId, road]) => [
        edgeId,
        { ...road }
      ])
    ),
    buildingsByNodeId: Object.fromEntries(
      Object.entries(initialPieces?.buildingsByNodeId ?? {}).map(
        ([nodeId, building]) => [nodeId, { ...building }]
      )
    )
  };
}

export function getHomeDemoVisiblePlayerIds(scenes = HOME_DEMO_SCENES) {
  const sceneList = Array.isArray(scenes) ? scenes : [scenes];
  const visiblePlayerIds = new Set();

  sceneList.forEach((item) => {
    if (item?.playerId) {
      visiblePlayerIds.add(item.playerId);
      return;
    }

    item?.events?.forEach((event) => visiblePlayerIds.add(event.playerId));
    item?.procedural?.playerIds?.forEach((playerId) =>
      visiblePlayerIds.add(playerId)
    );
    Object.values(item?.initialPieces?.roadsByEdgeId ?? {}).forEach((road) =>
      visiblePlayerIds.add(road.playerId)
    );
    Object.values(item?.initialPieces?.buildingsByNodeId ?? {}).forEach(
      (building) => visiblePlayerIds.add(building.playerId)
    );
  });

  return HOME_DEMO_PLAYERS.map((player) => player.id).filter((playerId) =>
    visiblePlayerIds.has(playerId)
  );
}

export function applyHomeDemoEvent(state, event) {
  if (!event) return state;

  if (event.type === "place-road") {
    const edgeId = event.target?.edgeId;
    if (!edgeId) return state;
    return {
      ...state,
      roadsByEdgeId: {
        ...state.roadsByEdgeId,
        [edgeId]: { edgeId, playerId: event.playerId }
      }
    };
  }

  const nodeId = event.target?.nodeId;
  if (nodeId == null) return state;

  const type = event.type === "place-city" ? "city" : "settlement";
  return {
    ...state,
    buildingsByNodeId: {
      ...state.buildingsByNodeId,
      [nodeId]: { nodeId, playerId: event.playerId, type }
    }
  };
}

export function getHomeDemoSceneFinalPieceState(scene) {
  return getHomeDemoSceneEvents(scene).reduce(
    applyHomeDemoEvent,
    createHomeDemoPieceState(scene?.initialPieces)
  );
}

export function getHomeDemoReducedMotionPieceState() {
  return getHomeDemoSceneFinalPieceState(
    HOME_DEMO_SCENES[HOME_DEMO_SCENES.length - 1]
  );
}
