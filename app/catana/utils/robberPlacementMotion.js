export const DEFAULT_ROBBER_PLACEMENT_MOTION_MODE = "playful";

export function resolveRobberPlacementMotionMode({
  requestedMode = DEFAULT_ROBBER_PLACEMENT_MOTION_MODE,
  prefersReducedMotion = false,
  hasCoarsePointer = false
} = {}) {
  if (prefersReducedMotion || hasCoarsePointer) {
    return "minimal";
  }

  return requestedMode === "minimal" ? "minimal" : "playful";
}
