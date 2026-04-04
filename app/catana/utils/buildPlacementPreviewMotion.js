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
      width: safeSize,
      height: safeSize * 0.2,
      offsetY: 0
    };
  }

  const pieceSize = safeSize * 0.8;

  return {
    width: pieceSize,
    height: pieceSize,
    offsetY: -pieceSize * 0.13
  };
}

const hasFiniteCenter = (target) =>
  Number.isFinite(target?.centerX) && Number.isFinite(target?.centerY);

const getTargetRadiusPx = (target, fallbackRadiusPx) => {
  const width = target?.width;
  const height = target?.height;

  if (
    Number.isFinite(width) &&
    width > 0 &&
    Number.isFinite(height) &&
    height > 0
  ) {
    return Math.min(width, height) / 2;
  }

  return fallbackRadiusPx;
};

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
  let closestDistanceSquared = Number.POSITIVE_INFINITY;

  normalizedTargets.forEach((target) => {
    const distanceSquared = getDistanceSquared(pointerX, pointerY, target);
    const targetRadiusPx = getTargetRadiusPx(target, magneticRadiusPx);

    if (distanceSquared > targetRadiusPx * targetRadiusPx) {
      return;
    }

    if (distanceSquared > closestDistanceSquared) {
      return;
    }

    closestTarget = target;
    closestDistanceSquared = distanceSquared;
  });

  if (closestTarget) {
    return closestTarget;
  }

  if (activeTarget) {
    const activeReleaseRadiusPx = getTargetRadiusPx(
      activeTarget,
      releaseRadiusPx
    );
    const activeDistanceSquared = getDistanceSquared(
      pointerX,
      pointerY,
      activeTarget
    );

    if (
      activeDistanceSquared <= activeReleaseRadiusPx * activeReleaseRadiusPx
    ) {
      return activeTarget;
    }
  }

  return null;
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
