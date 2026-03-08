import { describe, expect, it } from "vitest";
import { calculateBounds } from "./bounds.utils";

function createContext(props: {
  minPositionX: number;
  maxPositionX: number;
  minPositionY: number;
  maxPositionY: number;
}) {
  return {
    wrapperComponent: {
      offsetWidth: 1200,
      offsetHeight: 800,
    },
    contentComponent: {
      offsetWidth: 800,
      offsetHeight: 600,
    },
    setup: {
      centerZoomedOut: false,
    },
    props,
  } as any;
}

describe("calculateBounds", () => {
  it("keeps horizontal bounds symmetric for symmetric limits when zoomed out", () => {
    const context = createContext({
      minPositionX: -500,
      maxPositionX: 500,
      minPositionY: -200,
      maxPositionY: 200,
    });

    const bounds = calculateBounds(context, 0.3);

    expect(Math.abs(bounds.minPositionX)).toBe(bounds.maxPositionX);
  });
});
