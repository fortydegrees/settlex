import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HomeDemoEffectBridge } from "../homeDemo/HomeDemoEffectBridge.js";
import { HOME_DEMO_SCENES } from "../homeDemo/homeDemoSequence.js";

const harness = vi.hoisted(() => ({ effects: [], placement: vi.fn(), cancel: vi.fn() }));
// Render the real component with React, then explicitly mount its effects. The
// animation adapter is the only DOM-dependent boundary; scheduling/state is real.
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal(), useEffect: (effect) => harness.effects.push(effect),
}));
vi.mock("../utils/useWindowSize", () => ({
  default: () => ({ width: 1200, height: 800, isMeasured: true }),
}));
vi.mock("../effects/placePiece", () => ({
  createPiecePlacementRunner: () => Object.assign(harness.placement, { cancelAll: harness.cancel }),
}));

let cleanups;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  const document = new EventTarget();
  document.hidden = false;
  vi.stubGlobal("document", document);
  cleanups = [];
});
afterEach(() => {
  cleanups.forEach((cleanup) => cleanup?.());
  harness.effects.length = 0;
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mountBridge(onPieceStateChange) {
  renderToString(React.createElement(HomeDemoEffectBridge, {
    placementLayerRef: { current: null }, placementRoadLayerRef: { current: null },
    reservedHeight: 0, onPieceStateChange,
  }));
  cleanups = harness.effects.map((effect) => effect());
}

it("commits setup and curated pieces through two complete scene rotations", () => {
  const completed = [];
  let current;
  mountBridge((update) => {
    if (typeof update === "function") current = update(current);
    else {
      if (current) completed.push(current);
      current = update;
    }
  });
  for (let tick = 0; completed.length < HOME_DEMO_SCENES.length * 2 && tick < 2000; tick += 1) {
    vi.advanceTimersToNextTimer();
  }
  expect(completed).toHaveLength(HOME_DEMO_SCENES.length * 2);
  completed.forEach((state, index) => {
    const scene = HOME_DEMO_SCENES[index % HOME_DEMO_SCENES.length];
    // Roads from the scene's authored setup remain on the completed board.
    for (const [edgeId, road] of Object.entries(scene.initialPieces.roadsByEdgeId)) {
      expect(state.roadsByEdgeId[edgeId]).toEqual(road);
    }
  });
  const curatedIndex = HOME_DEMO_SCENES.findIndex((scene) => scene.id === "gentle-city");
  const first = completed[curatedIndex];
  const repeated = completed[curatedIndex + HOME_DEMO_SCENES.length];
  expect(Object.values(first.buildingsByNodeId).filter((piece) => piece.type === "city")).toHaveLength(2);
  expect(repeated).toEqual(first);
});

it("commits an interrupted placement only once and stops late updates after cleanup", () => {
  let updates = 0;
  let current;
  const buildingWrites = new Map();
  mountBridge((update) => {
    updates += 1;
    const next = typeof update === "function" ? update(current) : update;
    for (const [nodeId, building] of Object.entries(next.buildingsByNodeId)) {
      if (building !== current?.buildingsByNodeId[nodeId]) {
        buildingWrites.set(nodeId, (buildingWrites.get(nodeId) ?? 0) + 1);
      }
    }
    current = next;
  });
  vi.advanceTimersToNextTimer();
  expect(harness.placement).toHaveBeenCalledOnce();
  document.hidden = true;
  document.dispatchEvent(new Event("visibilitychange"));
  const firstNode = Object.keys(current.buildingsByNodeId)[0];
  expect(Object.keys(current.buildingsByNodeId)).toHaveLength(1);
  document.hidden = false;
  document.dispatchEvent(new Event("visibilitychange"));
  // The pending commit timer for the placement already completed on hide.
  vi.advanceTimersByTime(2000);
  expect(buildingWrites.get(firstNode)).toBe(1);
  cleanups.forEach((cleanup) => cleanup?.());
  cleanups = [];
  const afterCleanup = updates;
  vi.advanceTimersByTime(1000000);
  document.hidden = true;
  document.dispatchEvent(new Event("visibilitychange"));
  expect(updates).toBe(afterCleanup);
  expect(vi.getTimerCount()).toBe(0);
  expect(harness.cancel).toHaveBeenCalledTimes(2);
});
