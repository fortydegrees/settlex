import { describe, expect, it } from "vitest";
import { getBoardUnderlayFrame } from "../../utils/boardUnderlayLayout";

describe("boardUnderlayLayout", () => {
  it("scales the checked-in underlay from canonical asset bounds", () => {
    expect(
      getBoardUnderlayFrame({
        center: [500, 400],
        size: 100,
        viewBox: [-320, -240, 640, 480],
        designSize: 80,
      })
    ).toEqual({
      left: 100,
      top: 100,
      width: 800,
      height: 600,
    });
  });
});
