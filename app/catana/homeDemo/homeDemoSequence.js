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
  maxCommittedPieces: 8,
  resetHoldMs: 2600,
  commitLeadMs: 90,
  sequenceMode: "authored",
  allowHeroCityDrop: true
});

export const HOME_DEMO_EVENTS = Object.freeze([
  {
    id: "blue-road-1",
    type: "place-road",
    playerId: "home-blue",
    target: { edgeId: "29,32" },
    delayMs: [700, 1100]
  },
  {
    id: "blue-settlement-1",
    type: "place-settlement",
    playerId: "home-blue",
    target: { nodeId: 32 },
    delayMs: [900, 1400]
  },
  {
    id: "red-road-1",
    type: "place-road",
    playerId: "home-red",
    target: { edgeId: "21,31" },
    delayMs: [1000, 1500]
  },
  {
    id: "red-settlement-1",
    type: "place-settlement",
    playerId: "home-red",
    target: { nodeId: 31 },
    delayMs: [900, 1400]
  },
  {
    id: "green-road-1",
    type: "place-road",
    playerId: "home-green",
    target: { edgeId: "11,20" },
    delayMs: [1000, 1600]
  },
  {
    id: "green-settlement-1",
    type: "place-settlement",
    playerId: "home-green",
    target: { nodeId: 20 },
    delayMs: [900, 1400]
  },
  {
    id: "orange-road-1",
    type: "place-road",
    playerId: "home-orange",
    target: { edgeId: "38,39" },
    delayMs: [1000, 1600]
  },
  {
    id: "orange-city-1",
    type: "place-city",
    playerId: "home-orange",
    target: { nodeId: 38 },
    delayMs: [1200, 1800]
  }
]);

export function createHomeDemoPieceState() {
  return {
    roadsByEdgeId: {},
    buildingsByNodeId: {}
  };
}

export function getHomeDemoVisiblePlayerIds(events = HOME_DEMO_EVENTS) {
  return Array.from(new Set(events.map((event) => event.playerId)));
}

export function sampleHomeDemoDelay([min, max], random = Math.random) {
  return Math.round(min + (max - min) * random());
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

export function getHomeDemoReducedMotionPieceState() {
  return HOME_DEMO_EVENTS.reduce(
    applyHomeDemoEvent,
    createHomeDemoPieceState()
  );
}
