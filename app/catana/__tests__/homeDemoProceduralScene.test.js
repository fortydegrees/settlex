import { describe, expect, it } from "vitest";
import {
  buildableEdges,
  buildableNodes,
  createEmptyState
} from "@settlex/game-core";
import { HOME_DEMO_BOARD_PRESET } from "../homeDemo/homeDemoPreset";
import { generateHomeDemoProceduralEvents } from "../homeDemo/homeDemoProceduralScene";
import {
  HOME_DEMO_PLAYERS,
  HOME_DEMO_SCENES,
  applyHomeDemoEvent,
  createHomeDemoPieceState,
  getHomeDemoSceneEvents
} from "../homeDemo/homeDemoSequence";

function createCoreStateFromHomeState(pieceState) {
  const core = createEmptyState(HOME_DEMO_PLAYERS.map((player) => player.id));
  core.phase = "normal";
  core.roadsByEdgeId = Object.fromEntries(
    Object.entries(pieceState.roadsByEdgeId).map(([edgeId, road]) => [
      edgeId,
      road.playerId
    ])
  );
  core.buildingsByNodeId = Object.fromEntries(
    Object.entries(pieceState.buildingsByNodeId).map(([nodeId, building]) => [
      Number(nodeId),
      { ownerId: building.playerId, type: building.type }
    ])
  );
  return core;
}

function expectProceduralEventsLegal(scene, events) {
  let pieceState = createHomeDemoPieceState(scene.initialPieces);
  let previousAtMs = -1;

  events.forEach((event, index) => {
    expect(event.id).toBe(`${scene.id}-procedural-${index + 1}`);
    expect(event.atMs).toBeGreaterThan(previousAtMs);
    expect(event.atMs).toBeLessThan(scene.durationMs);
    previousAtMs = event.atMs;

    const core = createCoreStateFromHomeState(pieceState);

    if (event.type === "place-road") {
      expect(
        buildableEdges(
          core,
          HOME_DEMO_BOARD_PRESET.coreTopology,
          event.playerId,
          { initialPlacement: false }
        )
      ).toContain(event.target.edgeId);
    } else if (event.type === "place-settlement") {
      expect(
        buildableNodes(
          core,
          HOME_DEMO_BOARD_PRESET.coreTopology,
          event.playerId,
          { initialPlacement: false }
        )
      ).toContain(event.target.nodeId);
    } else {
      const building = pieceState.buildingsByNodeId[event.target.nodeId];
      expect(building).toMatchObject({
        playerId: event.playerId,
        type: "settlement"
      });
    }

    pieceState = applyHomeDemoEvent(pieceState, event);
  });
}

describe("home demo procedural scene", () => {
  it("generates deterministic legal ambient moves for a procedural scene", () => {
    const scene = HOME_DEMO_SCENES.find((candidate) => candidate.id === "quiet-expansion");

    expect(scene.mode).toBe("procedural");

    const firstRun = generateHomeDemoProceduralEvents(scene, { cycleIndex: 0 });
    const repeatedRun = generateHomeDemoProceduralEvents(scene, { cycleIndex: 0 });
    const nextRun = generateHomeDemoProceduralEvents(scene, { cycleIndex: 1 });

    expect(firstRun).toEqual(repeatedRun);
    expect(firstRun).not.toEqual(nextRun);
    expect(firstRun.length).toBeGreaterThanOrEqual(16);
    expect(firstRun.length).toBeLessThanOrEqual(scene.procedural.maxMoves);
    expect(firstRun.some((event) => event.type === "place-city")).toBe(true);

    expectProceduralEventsLegal(scene, firstRun);
    expectProceduralEventsLegal(scene, nextRun);
  });

  it("keeps procedural scene move counts loosely balanced across active players", () => {
    const proceduralScenes = HOME_DEMO_SCENES.filter(
      (candidate) => candidate.mode === "procedural"
    );

    expect(proceduralScenes.length).toBeGreaterThanOrEqual(3);

    proceduralScenes.forEach((scene) => {
      const events = generateHomeDemoProceduralEvents(scene, { cycleIndex: 0 });
      const counts = Object.fromEntries(
        scene.procedural.playerIds.map((playerId) => [playerId, 0])
      );
      events.forEach((event) => {
        counts[event.playerId] += 1;
      });

      const values = Object.values(counts);
      expect(
        Math.max(...values) - Math.min(...values),
        `${scene.id} generated counts ${JSON.stringify(counts)}`
      ).toBeLessThanOrEqual(5);
      expectProceduralEventsLegal(scene, events);
    });
  });

  it("resolves procedural scene events through the sequence API", () => {
    const scene = HOME_DEMO_SCENES.find((candidate) => candidate.id === "quiet-expansion");
    const events = getHomeDemoSceneEvents(scene, { cycleIndex: 2 });

    expect(events).toEqual(
      generateHomeDemoProceduralEvents(scene, { cycleIndex: 2 })
    );
  });
});
