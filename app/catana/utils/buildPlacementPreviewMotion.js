export const BUILD_PREVIEW_MAGNETIC_RADIUS_PX = 72;
export const BUILD_PREVIEW_RELEASE_RADIUS_PX = 112;
export const BUILD_PREVIEW_MAX_LEAN_DEGREES = 20;

export function getBuildPreviewViewportScale(boardViewportScale = 1) {
  return Number.isFinite(boardViewportScale) && boardViewportScale > 0
    ? boardViewportScale
    : 1;
}

export function getScaledBuildPreviewSize({
  baseSize,
  boardViewportScale = 1
} = {}) {
  if (!Number.isFinite(baseSize) || baseSize <= 0) {
    return 0;
  }

  return baseSize * getBuildPreviewViewportScale(boardViewportScale);
}

export function getBuildPreviewFrame(pieceType, baseSize) {
  const safeSize = Number.isFinite(baseSize) && baseSize > 0 ? baseSize : 0;

  if (pieceType === "road") {
    return {
      width: safeSize * 1.16,
      height: safeSize * 0.3,
      offsetY: safeSize * 0.1
    };
  }

  if (pieceType === "city") {
    return {
      width: safeSize,
      height: safeSize,
      offsetY: safeSize * 0.2
    };
  }

  return {
    width: safeSize * 0.86,
    height: safeSize * 0.86,
    offsetY: safeSize * 0.18
  };
}

const hasFiniteCenter = (target) =>
  Number.isFinite(target?.centerX) && Number.isFinite(target?.centerY);

const getDistanceSquared = (pointerX, pointerY, target) => {
  const deltaX = target.centerX - pointerX;
  const deltaY = target.centerY - pointerY;
  return deltaX * deltaX + deltaY * deltaY;
};

export function getMagneticBuildTarget({
  pointerX,
  pointerY,
  targets = [],
  activeTargetId = null,
  magneticRadiusPx = BUILD_PREVIEW_MAGNETIC_RADIUS_PX,
  releaseRadiusPx = BUILD_PREVIEW_RELEASE_RADIUS_PX
} = {}) {
  if (!Number.isFinite(pointerX) || !Number.isFinite(pointerY)) {
    return null;
  }

  const normalizedTargets = targets.filter(hasFiniteCenter);
  if (normalizedTargets.length === 0) {
    return null;
  }

  const activeTarget =
    activeTargetId == null
      ? null
      : normalizedTargets.find((target) => target.id === activeTargetId) ?? null;

  let closestTarget = null;
  let closestDistanceSquared = magneticRadiusPx * magneticRadiusPx;

  normalizedTargets.forEach((target) => {
    const distanceSquared = getDistanceSquared(pointerX, pointerY, target);
    if (distanceSquared > closestDistanceSquared) {
      return;
    }

    closestTarget = target;
    closestDistanceSquared = distanceSquared;
  });

  if (activeTarget) {
    const activeDistanceSquared = getDistanceSquared(
      pointerX,
      pointerY,
      activeTarget
    );

    if (
      closestTarget &&
      closestTarget.id !== activeTarget.id &&
      closestDistanceSquared < activeDistanceSquared
    ) {
      return closestTarget;
    }

    if (activeDistanceSquared <= releaseRadiusPx * releaseRadiusPx) {
      return activeTarget;
    }
  }

  return closestTarget;
}

export function getBuildPreviewLeanAngle(
  velocityX,
  maxLeanDegrees = BUILD_PREVIEW_MAX_LEAN_DEGREES
) {
  if (!Number.isFinite(velocityX)) {
    return 0;
  }

  return Math.max(
    -maxLeanDegrees,
    Math.min(maxLeanDegrees, velocityX * 0.04)
  );
}

export function getBuildPickupOrigin(originRect) {
  if (!originRect) {
    return null;
  }

  const centerX = originRect.left + originRect.width / 2;
  const centerY = originRect.top + originRect.height / 2;
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
    return null;
  }

  return { x: centerX, y: centerY };
}
