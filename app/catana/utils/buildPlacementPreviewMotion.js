export const BUILD_PREVIEW_MAGNETIC_RADIUS_PX = 72;
export const BUILD_PREVIEW_RELEASE_RADIUS_PX = 112;
export const BUILD_PREVIEW_MAX_LEAN_DEGREES = 20;

const BUILD_PICKUP_LAUNCH_CONFIG = {
  pressDurationMs: 58,
  liftDurationMs: 146,
  settleDurationMs: 132,
  startOffsetY: 10,
  startScale: 0.92,
  peakOffsetY: -26,
  peakScale: 1.08,
  settleScale: 1,
  liftEase: "power2.out",
  settleEase: "back.out(2.1)"
};
const BUILD_PICKUP_LAUNCH_CURSOR_BIAS_PX = 18;
const BUILD_TARGET_HANDOFF_DELAY_MS = {
  default: 96,
  road: 164
};
const BUILD_TARGET_HANDOFF_MAX_DELAY_MS = {
  default: 96,
  road: 272
};
const ROAD_TARGET_HANDOFF_ROTATION_THRESHOLD_DEGREES = 10;
const ROAD_TARGET_HANDOFF_DISTANCE_THRESHOLD_PX = 10;

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

export function getBuildTargetHandoffDelayMs(pieceType) {
  if (pieceType === "road") {
    return BUILD_TARGET_HANDOFF_DELAY_MS.road;
  }

  return BUILD_TARGET_HANDOFF_DELAY_MS.default;
}

export function isBuildTargetHandoffReady({
  pieceType,
  elapsedMs,
  currentRotationDegrees,
  desiredRotationDegrees,
  currentX,
  currentY,
  desiredX,
  desiredY
} = {}) {
  const minimumDelayMs = getBuildTargetHandoffDelayMs(pieceType);
  if (!Number.isFinite(elapsedMs) || elapsedMs < minimumDelayMs) {
    return false;
  }

  if (pieceType !== "road") {
    return true;
  }

  const maximumDelayMs = BUILD_TARGET_HANDOFF_MAX_DELAY_MS.road;
  if (elapsedMs >= maximumDelayMs) {
    return true;
  }

  const remainingRotationDegrees = Math.abs(
    getShortestRotationDelta(currentRotationDegrees, desiredRotationDegrees)
  );
  const positionIsFinite =
    Number.isFinite(currentX) &&
    Number.isFinite(currentY) &&
    Number.isFinite(desiredX) &&
    Number.isFinite(desiredY);
  const remainingDistancePx = positionIsFinite
    ? Math.hypot(desiredX - currentX, desiredY - currentY)
    : Number.POSITIVE_INFINITY;

  return (
    remainingRotationDegrees <= ROAD_TARGET_HANDOFF_ROTATION_THRESHOLD_DEGREES &&
    remainingDistancePx <= ROAD_TARGET_HANDOFF_DISTANCE_THRESHOLD_PX
  );
}

export function getBuildPickupLaunchBias({
  originX,
  originY,
  pointerX,
  pointerY,
  progress,
  maxDistancePx = BUILD_PICKUP_LAUNCH_CURSOR_BIAS_PX
} = {}) {
  if (
    !Number.isFinite(originX) ||
    !Number.isFinite(originY) ||
    !Number.isFinite(pointerX) ||
    !Number.isFinite(pointerY)
  ) {
    return { x: 0, y: 0 };
  }

  const clampedProgress = Math.max(0, Math.min(1, progress ?? 0));
  if (clampedProgress <= 0 || clampedProgress >= 1) {
    return { x: 0, y: 0 };
  }

  const deltaX = pointerX - originX;
  const deltaY = pointerY - originY;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance <= 0) {
    return { x: 0, y: 0 };
  }

  const limitedDistance = Math.min(distance, maxDistancePx);
  const influence = Math.sin(clampedProgress * Math.PI);
  const scale = (limitedDistance / distance) * influence;

  return {
    x: deltaX * scale,
    y: deltaY * scale
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
