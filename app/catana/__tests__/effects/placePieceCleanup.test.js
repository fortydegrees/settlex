import { describe, expect, it, vi } from "vitest";

const timelines = [];

vi.mock("gsap", () => ({
  gsap: {
    set: vi.fn(),
    timeline: vi.fn((options = {}) => {
      const timeline = {
        add: vi.fn(() => timeline),
        fromTo: vi.fn(() => timeline),
        kill: vi.fn(),
        onComplete: options.onComplete,
        to: vi.fn(() => timeline)
      };
      timelines.push(timeline);
      return timeline;
    })
  }
}));

import { createPiecePlacementRunner } from "../../effects/placePiece";

function makeElement() {
  const element = {
    children: [],
    parentNode: null,
    remove: vi.fn(function remove() {
      if (!this.parentNode) return;
      const index = this.parentNode.children.indexOf(this);
      if (index >= 0) this.parentNode.children.splice(index, 1);
      this.parentNode = null;
    }),
    style: {},
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }
  };
  return element;
}

function makeRunner(layerEl) {
  return createPiecePlacementRunner({
    getLayerEl: () => layerEl,
    getLayout: () => ({
      containerWidth: 100,
      center: [0, 0],
      size: 10
    }),
    getPlayerColor: () => "red",
    getTiles: () => [
      {
        coordinate: [0, 0, 0],
        tile: {
          edges: {},
          id: "tile-0",
          nodes: { NORTH: 1 }
        }
      }
    ],
    themeId: "classic",
    useBoardSpace: true
  });
}

describe("piece placement cleanup", () => {
  it("cancels only effects owned by the placement runner", () => {
    const previousDocument = global.document;
    const layerA = makeElement();
    const layerB = makeElement();
    global.document = {
      createElement: () => makeElement(),
      hidden: false
    };

    try {
      const runnerA = makeRunner(layerA);
      const runnerB = makeRunner(layerB);

      runnerA({ id: 1, pieceType: "settlement", playerId: "a" });
      runnerB({ id: 1, pieceType: "settlement", playerId: "b" });

      expect(layerA.children).toHaveLength(3);
      expect(layerB.children).toHaveLength(3);
      expect(timelines).toHaveLength(2);

      runnerA.cancelAll();

      expect(timelines[0].kill).toHaveBeenCalledOnce();
      expect(timelines[1].kill).not.toHaveBeenCalled();
      expect(layerA.children).toHaveLength(0);
      expect(layerB.children).toHaveLength(3);

      timelines[1].onComplete();
      expect(layerB.children).toHaveLength(0);
    } finally {
      timelines.length = 0;
      if (previousDocument === undefined) {
        delete global.document;
      } else {
        global.document = previousDocument;
      }
    }
  });
});
