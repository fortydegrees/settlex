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
      offsetWidth: 1000,
      offsetHeight: 800,
    },
    contentComponent: {
      offsetWidth: 1000,
      offsetHeight: 800,
    },
    setup: {
      centerZoomedOut: false,
    },
    props,
  } as any;
}

describe("calculateBounds", () => {
  it("uses content size for zoomed-in lower bounds and preserves configured top padding", () => {
    const context = createContext({
      minPositionX: -500,
      maxPositionX: 500,
      minPositionY: -200,
      maxPositionY: 500,
    });

    const bounds = calculateBounds(context, 2);

    expect(bounds).toEqual({
      minPositionX: -1500,
      maxPositionX: 500,
      minPositionY: -1000,
      maxPositionY: 500,
    });
  });

  it("adds configured pan room around the centered zoomed-out position", () => {
    const context = createContext({
      minPositionX: -500,
      maxPositionX: 500,
      minPositionY: -200,
      maxPositionY: 500,
    });

    const bounds = calculateBounds(context, 0.5);

    expect(bounds).toEqual({
      minPositionX: -250,
      maxPositionX: 750,
      minPositionY: 0,
      maxPositionY: 700,
    });
  });
});
