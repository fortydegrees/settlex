import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROBBER_PLACEMENT_MOTION_MODE,
  resolveRobberPlacementMotionMode
} from "../utils/robberPlacementMotion";

describe("robber placement motion mode", () => {
  it("defaults to playful when no fallback condition applies", () => {
    expect(DEFAULT_ROBBER_PLACEMENT_MOTION_MODE).toBe("playful");
    expect(
      resolveRobberPlacementMotionMode({
        requestedMode: "playful",
        prefersReducedMotion: false,
        hasCoarsePointer: false
      })
    ).toBe("playful");
  });

  it("falls back to minimal for reduced-motion users", () => {
    expect(
      resolveRobberPlacementMotionMode({
        requestedMode: "playful",
        prefersReducedMotion: true,
        hasCoarsePointer: false
      })
    ).toBe("minimal");
  });

  it("falls back to minimal for coarse pointers", () => {
    expect(
      resolveRobberPlacementMotionMode({
        requestedMode: "playful",
        prefersReducedMotion: false,
        hasCoarsePointer: true
      })
    ).toBe("minimal");
  });
});
