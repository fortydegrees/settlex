import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROBBER_PLACEMENT_MOTION_MODE,
  getRobberPlacementPresentationState,
  shouldCompleteRobberPlacementHandoff,
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

describe("robber placement confirmation handoff", () => {
  it("keeps the moving preview authoritative until it settles and the move is confirmed", () => {
    expect(
      getRobberPlacementPresentationState({
        isPlacementActive: false,
        pendingPlacement: { tileId: 13, settled: false },
        authoritativeTileId: 13
      })
    ).toEqual({
      previewActive: true,
      hiddenStaticTileId: 13,
      handoffComplete: false
    });

    expect(
      getRobberPlacementPresentationState({
        isPlacementActive: false,
        pendingPlacement: { tileId: 13, settled: true },
        authoritativeTileId: 12
      })
    ).toEqual({
      previewActive: true,
      hiddenStaticTileId: 13,
      handoffComplete: false
    });

    expect(
      getRobberPlacementPresentationState({
        isPlacementActive: false,
        pendingPlacement: { tileId: 13, settled: true },
        authoritativeTileId: 13
      })
    ).toEqual({
      previewActive: true,
      hiddenStaticTileId: 13,
      handoffComplete: true
    });
  });

  it("completes only after the committed target is the settled preview target", () => {
    expect(
      shouldCompleteRobberPlacementHandoff({
        committedTargetTileId: 13,
        activeTargetTileId: 13,
        previewAtRest: true
      })
    ).toBe(true);

    expect(
      shouldCompleteRobberPlacementHandoff({
        committedTargetTileId: 13,
        activeTargetTileId: 12,
        previewAtRest: true
      })
    ).toBe(false);

    expect(
      shouldCompleteRobberPlacementHandoff({
        committedTargetTileId: 13,
        activeTargetTileId: 13,
        previewAtRest: false
      })
    ).toBe(false);
  });
});
