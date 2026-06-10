import { describe, expect, it } from "vitest";
import { HOME_DEMO_BOARD_PRESET } from "../homeDemo/homeDemoPreset";
import {
  HOME_DEMO_EVENTS,
  HOME_DEMO_PLAYERS,
  applyHomeDemoEvent,
  createHomeDemoPieceState,
  getHomeDemoReducedMotionPieceState,
  getHomeDemoVisiblePlayerIds,
  sampleHomeDemoDelay
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
    expect(getHomeDemoVisiblePlayerIds(HOME_DEMO_EVENTS)).toEqual([
      "home-blue",
      "home-red",
      "home-green",
      "home-orange"
    ]);
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

  it("samples delay inside the configured range", () => {
    const delay = sampleHomeDemoDelay([800, 1400], () => 0.25);
    expect(delay).toBe(950);
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

    HOME_DEMO_EVENTS.forEach((event) => {
      if ("edgeId" in event.target) {
        expect(renderMaps.edgeRenderById[event.target.edgeId]).toBeTruthy();
      } else {
        expect(renderMaps.nodeRenderById[String(event.target.nodeId)]).toBeTruthy();
      }
    });
  });
});
