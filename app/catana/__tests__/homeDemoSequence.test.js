import { describe, expect, it } from "vitest";
import { HOME_DEMO_BOARD_PRESET } from "../homeDemo/homeDemoPreset";
import {
  HOME_DEMO_SCENES,
  HOME_DEMO_PLAYERS,
  applyHomeDemoEvent,
  createHomeDemoPieceState,
  getHomeDemoSceneFinalPieceState,
  getHomeDemoSceneEvents,
  getHomeDemoSceneSetupEvents,
  getHomeDemoReducedMotionPieceState,
  getHomeDemoVisiblePlayerIds
} from "../homeDemo/homeDemoSequence";
import { buildRenderMaps } from "../utils/renderMaps";

describe("home demo sequence", () => {
  it("uses four authored demo players", () => {
    expect(HOME_DEMO_PLAYERS.map((player) => player.id)).toEqual([
      "home-blue",
      "home-red",
      "home-green",
      "home-orange"
    ]);
    expect(getHomeDemoVisiblePlayerIds()).toEqual([
      "home-blue",
      "home-red",
      "home-green",
      "home-orange"
    ]);
  });

  it("defines a small set of ambient scenes with absolute timing beats", () => {
    expect(HOME_DEMO_SCENES.length).toBeGreaterThanOrEqual(4);
    expect(HOME_DEMO_SCENES.length).toBeLessThanOrEqual(7);
    expect(HOME_DEMO_SCENES[0].id).toBe("quiet-expansion");
    expect(HOME_DEMO_SCENES.some((scene) => scene.id === "opening-table")).toBe(
      false
    );

    HOME_DEMO_SCENES.forEach((scene) => {
      expect(scene.durationMs).toBeGreaterThanOrEqual(56000);
      expect(scene.durationMs).toBeLessThanOrEqual(70000);

      const events = getHomeDemoSceneEvents(scene);
      expect(events.length).toBeGreaterThanOrEqual(
        scene.mode === "procedural" ? 12 : 12
      );
      expect(events.length).toBeLessThanOrEqual(
        scene.mode === "procedural" ? scene.procedural.maxMoves : 16
      );

      let previousAtMs = -1;
      events.forEach((event) => {
        expect(event.atMs).toBeGreaterThan(previousAtMs);
        expect(event.atMs).toBeLessThan(scene.durationMs);
        expect(event.delayMs).toBeUndefined();
        previousAtMs = event.atMs;
      });
    });
  });

  it("varies scene player counts and starting board positions", () => {
    const setupPlayerCounts = HOME_DEMO_SCENES.map(
      (scene) =>
        new Set([
          ...Object.values(scene.initialPieces.roadsByEdgeId).map(
            (road) => road.playerId
          ),
          ...Object.values(scene.initialPieces.buildingsByNodeId).map(
            (building) => building.playerId
          )
        ]).size
    );
    const startingNodeSignatures = new Set(
      HOME_DEMO_SCENES.map((scene) =>
        Object.keys(scene.initialPieces.buildingsByNodeId)
          .map(Number)
          .sort((a, b) => a - b)
          .join(",")
      )
    );
    const duelScene = HOME_DEMO_SCENES.find((scene) => scene.id === "coastal-duel");

    expect(setupPlayerCounts).toContain(2);
    expect(setupPlayerCounts).toContain(3);
    expect(setupPlayerCounts).toContain(4);
    expect(startingNodeSignatures.size).toBeGreaterThanOrEqual(3);
    expect(duelScene.procedural.playerIds).toEqual(["home-blue", "home-red"]);
  });

  it("includes a normal two-player opening with two settlements and two roads each", () => {
    const normalDuelScene = HOME_DEMO_SCENES.find(
      (scene) => scene.id === "normal-duel-openings"
    );
    const buildings = Object.values(normalDuelScene.initialPieces.buildingsByNodeId);
    const roads = Object.values(normalDuelScene.initialPieces.roadsByEdgeId);

    expect(normalDuelScene.procedural.playerIds).toEqual([
      "home-blue",
      "home-red"
    ]);
    expect(buildings.filter((building) => building.playerId === "home-blue")).toHaveLength(
      2
    );
    expect(buildings.filter((building) => building.playerId === "home-red")).toHaveLength(
      2
    );
    expect(roads.filter((road) => road.playerId === "home-blue")).toHaveLength(2);
    expect(roads.filter((road) => road.playerId === "home-red")).toHaveLength(2);
    expect(normalDuelScene.initialPieces.buildingsByNodeId[11]).toMatchObject({
      playerId: "home-blue"
    });
    expect(normalDuelScene.initialPieces.buildingsByNodeId[25]).toMatchObject({
      playerId: "home-blue"
    });
  });

  it("keeps the first procedural scene dense enough for a longer ambient cycle", () => {
    const expansionScene = HOME_DEMO_SCENES[0];

    expect(expansionScene.id).toBe("quiet-expansion");
    expect(expansionScene.durationMs).toBe(64000);
    expect(expansionScene.procedural.maxMoves).toBe(48);
  });

  it("commits roads, settlements, and city upgrades into demo state", () => {
    let state = createHomeDemoPieceState();
    state = applyHomeDemoEvent(state, {
      id: "blue-road-1",
      type: "place-road",
      playerId: "home-blue",
      target: { edgeId: "29,32" }
    });
    state = applyHomeDemoEvent(state, {
      id: "blue-settlement-1",
      type: "place-settlement",
      playerId: "home-blue",
      target: { nodeId: 32 }
    });
    state = applyHomeDemoEvent(state, {
      id: "blue-city-1",
      type: "place-city",
      playerId: "home-blue",
      target: { nodeId: 32 }
    });

    expect(state.roadsByEdgeId["29,32"]).toEqual({
      edgeId: "29,32",
      playerId: "home-blue"
    });
    expect(state.buildingsByNodeId[32]).toEqual({
      nodeId: 32,
      playerId: "home-blue",
      type: "city"
    });
  });

  it("starts scenes from their own initial pieces and computes final state", () => {
    const expansionScene = HOME_DEMO_SCENES.find(
      (scene) => scene.id === "quiet-expansion"
    );

    const initialState = createHomeDemoPieceState(expansionScene.initialPieces);
    expect(Object.keys(initialState.roadsByEdgeId).length).toBeGreaterThan(0);
    expect(Object.keys(initialState.buildingsByNodeId).length).toBeGreaterThan(0);

    const finalState = getHomeDemoSceneFinalPieceState(expansionScene);
    expect(Object.keys(finalState.roadsByEdgeId).length).toBeGreaterThan(
      Object.keys(initialState.roadsByEdgeId).length
    );
    expect(Object.keys(finalState.buildingsByNodeId).length).toBeGreaterThan(
      Object.keys(initialState.buildingsByNodeId).length
    );
  });

  it("converts scene initial pieces into viewport-top setup placement events", () => {
    const expansionScene = HOME_DEMO_SCENES.find(
      (scene) => scene.id === "quiet-expansion"
    );
    const expectedInitialPieceCount =
      Object.keys(expansionScene.initialPieces.roadsByEdgeId).length +
      Object.keys(expansionScene.initialPieces.buildingsByNodeId).length;

    const setupEvents = getHomeDemoSceneSetupEvents(expansionScene);
    expect(setupEvents).toHaveLength(expectedInitialPieceCount);
    expect(setupEvents.every((event) => event.setupPhase)).toBe(true);
    expect(setupEvents.every((event) => event.startFrom === "viewport-top")).toBe(
      true
    );

    let previousAtMs = -1;
    const setupState = setupEvents.reduce((state, event) => {
      expect(event.atMs).toBeGreaterThan(previousAtMs);
      previousAtMs = event.atMs;
      return applyHomeDemoEvent(state, event);
    }, createHomeDemoPieceState());

    expect(setupState).toEqual(createHomeDemoPieceState(expansionScene.initialPieces));
  });

  it("provides a stable reduced-motion board state", () => {
    const state = getHomeDemoReducedMotionPieceState();
    expect(Object.keys(state.roadsByEdgeId).length).toBeGreaterThan(0);
    expect(Object.keys(state.buildingsByNodeId).length).toBeGreaterThan(0);
  });

  it("uses a curated board preset with no pre-existing demo pieces", () => {
    expect(HOME_DEMO_BOARD_PRESET.tiles.length).toBeGreaterThan(0);
    expect(HOME_DEMO_BOARD_PRESET.initialPieces).toEqual({
      roadsByEdgeId: {},
      buildingsByNodeId: {}
    });
  });

  it("all authored event targets exist on the curated board", () => {
    const renderMaps = buildRenderMaps(HOME_DEMO_BOARD_PRESET.tiles);

    HOME_DEMO_SCENES.forEach((scene) => {
      Object.values(scene.initialPieces.roadsByEdgeId).forEach((road) => {
        expect(renderMaps.edgeRenderById[road.edgeId]).toBeTruthy();
      });
      Object.values(scene.initialPieces.buildingsByNodeId).forEach((building) => {
        expect(renderMaps.nodeRenderById[String(building.nodeId)]).toBeTruthy();
      });
      getHomeDemoSceneEvents(scene).forEach((event) => {
        if ("edgeId" in event.target) {
          expect(renderMaps.edgeRenderById[event.target.edgeId]).toBeTruthy();
        } else {
          expect(renderMaps.nodeRenderById[String(event.target.nodeId)]).toBeTruthy();
        }
      });
    });
  });

  it("keeps each scene's initial pieces legal-looking and connected", () => {
    const topology = HOME_DEMO_BOARD_PRESET.coreTopology;

    HOME_DEMO_SCENES.forEach((scene) => {
      const initialBuildings = Object.values(scene.initialPieces.buildingsByNodeId);

      initialBuildings.forEach((building, index) => {
        initialBuildings.slice(index + 1).forEach((otherBuilding) => {
          expect(topology.nodeNeighbors[building.nodeId] ?? []).not.toContain(
            otherBuilding.nodeId
          );
        });
      });

      Object.values(scene.initialPieces.roadsByEdgeId).forEach((road) => {
        const roadNodes = topology.edgeNodes[road.edgeId] ?? [];
        const playerNodeIds = initialBuildings
          .filter((building) => building.playerId === road.playerId)
          .map((building) => building.nodeId);

        expect(roadNodes.some((nodeId) => playerNodeIds.includes(nodeId))).toBe(
          true
        );
      });
    });
  });

  it("keeps city upgrades believable within each scene", () => {
    HOME_DEMO_SCENES.forEach((scene) => {
      const buildings = { ...(scene.initialPieces?.buildingsByNodeId ?? {}) };

      getHomeDemoSceneEvents(scene).forEach((event) => {
        if (event.type === "place-city") {
          const nodeId = event.target.nodeId;
          expect(buildings[nodeId]?.type).toBe("settlement");
          expect(buildings[nodeId]?.playerId).toBe(event.playerId);
        }

        const nextState = applyHomeDemoEvent(
          { roadsByEdgeId: {}, buildingsByNodeId: buildings },
          event
        );
        Object.assign(buildings, nextState.buildingsByNodeId);
      });
    });
  });
});
