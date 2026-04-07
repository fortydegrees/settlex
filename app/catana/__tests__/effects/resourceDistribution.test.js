import { describe, expect, it, vi } from "vitest";

vi.mock("gsap", () => {
  const makeTimeline = () => {
    const timeline = {
      addLabel: vi.fn(() => timeline),
      call: vi.fn((fn) => {
        fn?.();
        return timeline;
      }),
      to: vi.fn(() => timeline)
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
  getBoardViewportScale,
  getCardTravelTargetPosition,
  getCardAnimationConfig,
  createResourceDistributionRunner,
  getDistributionTimings,
  getTileCardStartPosition,
  getRandomizedOffsets,
  scheduleResourceCues
} from "../../effects/resourceDistribution";

describe("resourceDistribution cues", () => {
  it("registers pop-start cue", () => {
    const calls = [];
    const tl = {
      call: (_, __, label) => calls.push(label)
    };
    scheduleResourceCues(tl, () => {});
    expect(calls).toContain("pop");
  });

  it("builds a pop-heavy card animation config", () => {
    const config = getCardAnimationConfig({
      startX: 10,
      startY: 20,
      endX: 100,
      endY: 200,
      jitterX: 2,
      jitterY: -3,
      rotate: 4
    });

    expect(config.from.scale).toBeLessThan(1);
    expect(config.pop.scale).toBeGreaterThan(1);
    expect(config.settle.scale).toBe(1);
    expect(config.pop.ease).toContain("back");
    expect(config.from.x).toBe(12);
    expect(config.from.y).toBe(17);
    expect(config.travel.x).toBe(100);
    expect(config.travel.y).toBe(200);
  });

  it("supports board-space scaling and normalizes to HUD scale during travel", () => {
    const config = getCardAnimationConfig({
      startX: 10,
      startY: 20,
      endX: 100,
      endY: 200,
      scaleMultiplier: 2,
      endScale: 1
    });

    expect(config.from.scale).toBeCloseTo(0.4, 5);
    expect(config.pop.scale).toBeCloseTo(2.3, 5);
    expect(config.settle.scale).toBe(2);
    expect(config.travel.scale).toBe(1);
  });

  it("computes jitter offsets from provided random", () => {
    const rand = () => 1;
    const offsets = getRandomizedOffsets(rand);
    expect(offsets.jitterX).toBeGreaterThan(0);
    expect(offsets.jitterY).toBeGreaterThan(0);
    expect(offsets.rotate).toBeGreaterThan(0);
  });

  it("schedules travel after the final pop settles", () => {
    const timings = getDistributionTimings({
      index: 2,
      count: 4,
      baseDelay: 1,
      popStagger: 0.1,
      travelStagger: 0.02,
      popDuration: 0.3,
      travelCueLead: 0.02
    });

    expect(timings.travelStart).toBeCloseTo(1 + 0.1 * (4 - 1) + 0.3, 5);
    expect(timings.travelStartForCard).toBeCloseTo(
      timings.travelStart + 0.02 * 2,
      5
    );
  });

  it("offsets travel cue by the lead time", () => {
    const timings = getDistributionTimings({
      index: 0,
      count: 1,
      baseDelay: 1,
      popStagger: 0.1,
      travelStagger: 0.02,
      popDuration: 0.3,
      travelCueLead: 0.02
    });

    expect(timings.travelCueAt).toBeCloseTo(timings.travelStart - 0.02, 5);
  });

  it("converts tile start position into viewport space with zoom scale", () => {
    const boardRect = { left: 10, top: 20, width: 2000 };
    const layoutContainerWidth = 1000;
    const scale = getBoardViewportScale({
      boardRect,
      layoutContainerWidth
    });
    const { startX, startY } = getTileCardStartPosition({
      boardRect,
      tileX: 300,
      tileY: 400,
      size: 100,
      cardWidth: 50,
      scale
    });

    expect(scale).toBe(2);
    expect(startX).toBe(585);
    expect(startY).toBe(620);
  });

  it("keeps the legacy lift for specific resource-row targets", () => {
    expect(
      getCardTravelTargetPosition({
        targetRect: { left: 120, top: 200, height: 40 },
        cardHeight: 63,
        targetKind: "specific"
      })
    ).toEqual({
      endX: 120,
      endY: 185
    });
  });

  it("centers vertically when targeting a generic resource stack", () => {
    expect(
      getCardTravelTargetPosition({
        targetRect: { left: 120, top: 200, height: 72 },
        cardHeight: 63,
        targetKind: "stack"
      })
    ).toEqual({
      endX: 120,
      endY: 204.5
    });
  });

  it("spawns bespoke resource-card fronts for the distributed resource", () => {
    const makeElement = (tagName) => ({
      tagName: tagName.toUpperCase(),
      className: "",
      style: {},
      children: [],
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      remove() {}
    });
    const layerEl = makeElement("div");
    const targetEl = {
      getBoundingClientRect: () => ({ left: 320, top: 180 })
    };
    const fakeDocument = {
      hidden: false,
      createElement(tagName) {
        return makeElement(tagName);
      },
      getElementById(id) {
        return id === "p0-Wood" ? targetEl : null;
      }
    };
    const previousDocument = global.document;

    global.document = fakeDocument;

    try {
      const run = createResourceDistributionRunner({
        layerEl,
        getLayout: () => ({
          size: 100,
          center: [0, 0],
          containerWidth: 1000
        }),
        getBoardRect: () => ({
          left: 10,
          top: 20,
          width: 1000
        }),
        random: () => 0.5,
        themeId: "classic"
      });

      run([
        {
          coordinate: [0, 0, 0],
          playerID: 0,
          resource: "Wood"
        }
      ]);

      expect(layerEl.children).toHaveLength(1);
      expect(layerEl.children[0].style.backgroundColor ?? "").toBe("");
      expect(layerEl.children[0].style.width).toBe("45px");
      expect(layerEl.children[0].style.height).toBe("63px");
      expect(layerEl.children[0].children).toHaveLength(1);
      expect(layerEl.children[0].children[0].tagName).toBe("IMG");
      expect(layerEl.children[0].children[0].src).toBe("/svgs/cards/resource/card_wood.svg");
      expect(layerEl.children[0].children[0].draggable).toBe(false);
      expect(layerEl.children[0].children[0].style.objectFit).toBe("contain");
    } finally {
      if (previousDocument === undefined) {
        delete global.document;
      } else {
        global.document = previousDocument;
      }
    }
  });

  it("invokes onComplete after the local distribution run finishes", () => {
    const makeElement = (tagName) => ({
      tagName: tagName.toUpperCase(),
      className: "",
      style: {},
      children: [],
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      remove() {}
    });
    const layerEl = makeElement("div");
    const targetEl = {
      getBoundingClientRect: () => ({ left: 320, top: 180, height: 40 })
    };
    const fakeDocument = {
      hidden: false,
      createElement(tagName) {
        return makeElement(tagName);
      },
      getElementById(id) {
        return id === "p0-Wood" ? targetEl : null;
      }
    };
    const onComplete = vi.fn();
    const previousDocument = global.document;

    global.document = fakeDocument;

    try {
      const run = createResourceDistributionRunner({
        layerEl,
        getLayout: () => ({
          size: 100,
          center: [0, 0],
          containerWidth: 1000
        }),
        getBoardRect: () => ({
          left: 10,
          top: 20,
          width: 1000
        }),
        random: () => 0.5,
        themeId: "classic",
        onComplete
      });

      run([
        {
          coordinate: [0, 0, 0],
          playerID: 0,
          resource: "Wood"
        }
      ]);

      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      if (previousDocument === undefined) {
        delete global.document;
      } else {
        global.document = previousDocument;
      }
    }
  });
});
