export const DEFAULT_ROBBER_PLACEMENT_MOTION_MODE = "playful";

export function getRobberPlacementPresentationState({
  isPlacementActive = false,
  pendingPlacement = null,
  authoritativeTileId = null
} = {}) {
  const pendingTargetId = pendingPlacement?.tileId ?? null;
  const handoffComplete =
    pendingTargetId != null &&
    pendingPlacement?.settled === true &&
    String(authoritativeTileId) === String(pendingTargetId);

  return {
    previewActive: isPlacementActive || pendingTargetId != null,
    hiddenStaticTileId: pendingTargetId,
    handoffComplete
  };
}

export function shouldCompleteRobberPlacementHandoff({
  committedTargetTileId = null,
  activeTargetTileId = null,
  previewAtRest = false
} = {}) {
  return (
    previewAtRest &&
    committedTargetTileId != null &&
    activeTargetTileId != null &&
    String(committedTargetTileId) === String(activeTargetTileId)
  );
}

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
