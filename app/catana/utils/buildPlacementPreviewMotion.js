export const BUILD_PREVIEW_MAGNETIC_RADIUS_PX = 72;
export const BUILD_PREVIEW_RELEASE_RADIUS_PX = 112;
export const BUILD_PREVIEW_MAX_LEAN_DEGREES = 20;

const BUILD_PICKUP_LAUNCH_CONFIG = {
  pressDurationMs: 36,
  liftDurationMs: 132,
  settleDurationMs: 128,
  startOffsetY: 8,
  startScale: 0.92,
  peakOffsetY: -20,
  peakScale: 1.05,
  settleScale: 1,
  liftEase: "power2.out",
  settleEase: "back.out(2.1)"
};

export function getBuildPreviewViewportScale(boardViewportScale = 1) {
  return Number.isFinite(boardViewportScale) && boardViewportScale > 0
    ? boardViewportScale
    : 1;
}

export function getBuildPickupLaunchMotion(pieceType) {
  const isRoad = pieceType === "road";
  const startOffsetY = isRoad
    ? BUILD_PICKUP_LAUNCH_CONFIG.startOffsetY - 2
    : BUILD_PICKUP_LAUNCH_CONFIG.startOffsetY;
  const peakOffsetY = isRoad
    ? BUILD_PICKUP_LAUNCH_CONFIG.peakOffsetY + 2
    : BUILD_PICKUP_LAUNCH_CONFIG.peakOffsetY;
  const peakScale = isRoad
    ? BUILD_PICKUP_LAUNCH_CONFIG.peakScale - 0.02
    : BUILD_PICKUP_LAUNCH_CONFIG.peakScale;

  return {
    pressDurationMs: BUILD_PICKUP_LAUNCH_CONFIG.pressDurationMs,
    liftDurationMs: BUILD_PICKUP_LAUNCH_CONFIG.liftDurationMs,
    settleDurationMs: BUILD_PICKUP_LAUNCH_CONFIG.settleDurationMs,
    totalDurationMs:
      BUILD_PICKUP_LAUNCH_CONFIG.pressDurationMs +
      BUILD_PICKUP_LAUNCH_CONFIG.liftDurationMs +
      BUILD_PICKUP_LAUNCH_CONFIG.settleDurationMs,
    startOffsetY,
    startScale: BUILD_PICKUP_LAUNCH_CONFIG.startScale,
    peakOffsetY,
    peakScale,
    settleScale: BUILD_PICKUP_LAUNCH_CONFIG.settleScale,
    liftEase: BUILD_PICKUP_LAUNCH_CONFIG.liftEase,
    settleEase: BUILD_PICKUP_LAUNCH_CONFIG.settleEase
  };
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

export function getShortestRotationDelta(
  currentDegrees,
  desiredDegrees
) {
  if (!Number.isFinite(currentDegrees) || !Number.isFinite(desiredDegrees)) {
    return 0;
  }

  const normalizedDelta =
    ((((desiredDegrees - currentDegrees) % 360) + 540) % 360) - 180;

  return normalizedDelta === -180 ? 180 : normalizedDelta;
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
