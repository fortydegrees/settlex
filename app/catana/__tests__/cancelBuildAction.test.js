import { describe, expect, it } from "vitest";
import { shouldCancelBuildAction } from "../utils/cancelBuildAction";

describe("shouldCancelBuildAction", () => {
  it("cancels normal build actions when click is not on an action circle", () => {
    expect(
      shouldCancelBuildAction({
        playerAction: "placeRoad",
        phase: "main",
        targetIsActionCircle: false
      })
    ).toBe(true);
  });

  it("does not cancel when clicking an action circle", () => {
    expect(
      shouldCancelBuildAction({
        playerAction: "placeSettlement",
        phase: "main",
        targetIsActionCircle: true
      })
    ).toBe(false);
  });

  it("does not cancel during placement phase", () => {
    expect(
      shouldCancelBuildAction({
        playerAction: "placeCity",
        phase: "placement",
        targetIsActionCircle: false
      })
    ).toBe(false);
  });

  it("does not cancel dev-card actions", () => {
    expect(
      shouldCancelBuildAction({
        playerAction: "roadBuilding",
        phase: "main",
        targetIsActionCircle: false
      })
    ).toBe(false);
  });
});
