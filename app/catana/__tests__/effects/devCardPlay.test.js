import { describe, expect, it, vi } from "vitest";

vi.mock("gsap", () => {
  const makeTimeline = (options = {}) => {
    const timeline = {
      to: vi.fn(() => {
        options.onComplete?.();
        return timeline;
      })
    };
    return timeline;
  };

  return {
    gsap: {
      set: vi.fn(),
      timeline: vi.fn(makeTimeline)
    }
  };
});

import {
  createDevCardPlayRunner,
  getDevCardPlayActorKey,
  getDevCardPlayedScale,
  getDevCardPlayParkPosition,
  getDevCardPlaySourceId
} from "../../effects/devCardPlay";

const makeElement = (rect) => ({
  style: {},
  children: [],
  appendChild(child) {
    this.children.push(child);
    return child;
  },
  querySelector(selector) {
    if (selector !== "img") return null;
    return this.children.find((child) => child.tagName === "IMG") ?? null;
  },
  remove: vi.fn(),
  getBoundingClientRect: () => rect
});

describe("devCardPlay runner", () => {
  it("uses the local dev-card shell anchor for the local start perspective", () => {
    expect(
      getDevCardPlaySourceId({
        playerId: "0",
        cardType: "knight",
        perspective: "local"
      })
    ).toBe("p0-devcards");
  });

  it("uses the generic dev stack anchor for opponent presentation", () => {
    expect(
      getDevCardPlaySourceId({
        playerId: "1",
        cardType: "knight",
        perspective: "opponent"
      })
    ).toBe("p1-devcards");
  });

  it("parks local and opponent played Knight cards at their enlarged scales", () => {
    const sourceRect = { left: 100, top: 200, width: 52, height: 72, bottom: 272 };
    const localPark = getDevCardPlayParkPosition({
      sourceRect,
      perspective: "local"
    });
    const opponentPark = getDevCardPlayParkPosition({
      sourceRect,
      perspective: "opponent"
    });

    expect(getDevCardPlayedScale("local")).toBe(2);
    expect(getDevCardPlayedScale("opponent")).toBe(2);
    expect(localPark.x).toBe(100);
    expect(localPark.y).toBeLessThan(sourceRect.top - 72);
    expect(opponentPark.y).toBeGreaterThan(sourceRect.bottom + 48);
  });

  it("parks a start actor and resolves it to the Largest Army target", () => {
    const previousDocument = global.document;
    const layer = makeElement({ left: 0, top: 0, width: 0, height: 0 });
    const source = makeElement({ left: 100, top: 200, width: 52, height: 72, bottom: 272 });
    const target = makeElement({ left: 20, top: 30, width: 70, height: 28 });
    const onStart = vi.fn();
    const onResolveComplete = vi.fn();

    global.document = {
      hidden: false,
      createElement: () => makeElement({ left: 0, top: 0, width: 0, height: 0 }),
      getElementById: (id) => {
        if (id === "p0-devcards") return source;
        if (id === "p0-largest-army") return target;
        return null;
      }
    };

    try {
      const actorStore = { current: new Map() };
      const run = createDevCardPlayRunner({
        layerEl: layer,
        getPerspective: () => "local",
        getMotionPolicy: () => "full",
        actorStore,
        onStart,
        onResolveComplete
      });
      const payload = {
        effectId: "devcard:knight:0:turn-1",
        playerId: "0",
        cardType: "knight",
        phase: "start"
      };

      run(payload);

      expect(onStart).toHaveBeenCalledWith(payload);
      expect(actorStore.current.has(getDevCardPlayActorKey(payload))).toBe(true);
      expect(layer.children).toHaveLength(1);
      expect(layer.children[0].style.filter).toContain("drop-shadow");

      run({ ...payload, phase: "resolve" });

      expect(onResolveComplete).toHaveBeenCalled();
      expect(actorStore.current.has(getDevCardPlayActorKey(payload))).toBe(false);
    } finally {
      if (previousDocument === undefined) {
        delete global.document;
      } else {
        global.document = previousDocument;
      }
    }
  });
});
