import { describe, it, expect } from "vitest";
import { getOpponentResourceBadgeTone } from "../components/OpponentPlayerBoxUtils";

describe("getOpponentResourceBadgeTone", () => {
  it("returns danger when resources exceed discard limit", () => {
    expect(getOpponentResourceBadgeTone({ resourceCount: 8, discardLimit: 7 }))
      .toBe("danger");
  });

  it("returns default when resources are at or below the limit", () => {
    expect(getOpponentResourceBadgeTone({ resourceCount: 7, discardLimit: 7 }))
      .toBe("default");
  });
});
