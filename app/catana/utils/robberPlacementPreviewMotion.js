import { SQRT3 } from "./coordinates";

export const ROBBER_PREVIEW_MAGNETIC_RADIUS_PX = 72;
export const ROBBER_PREVIEW_RELEASE_RADIUS_PX = 108;
export const ROBBER_PREVIEW_MAX_LEAN_DEGREES = 60;
const ROBBER_PREVIEW_LOCKED_OFFSET_X_FACTOR = -0.34;
const ROBBER_PREVIEW_LOCKED_OFFSET_Y_FACTOR = 0.12;

const hasFiniteCenter = (target) =>
  Number.isFinite(target?.centerX) && Number.isFinite(target?.centerY);

const getDistanceSquared = (pointerX, pointerY, target) => {
  const deltaX = target.centerX - pointerX;
  const deltaY = target.centerY - pointerY;
  return deltaX * deltaX + deltaY * deltaY;
};

export function getMagneticRobberTarget({
  pointerX,
  pointerY,
  targets = [],
  activeTargetTileId = null,
  magneticRadiusPx = ROBBER_PREVIEW_MAGNETIC_RADIUS_PX,
  releaseRadiusPx = ROBBER_PREVIEW_RELEASE_RADIUS_PX
} = {}) {
  if (!Number.isFinite(pointerX) || !Number.isFinite(pointerY)) {
    return null;
  }

  const normalizedTargets = targets.filter(hasFiniteCenter);
  if (normalizedTargets.length === 0) {
    return null;
  }

  const activeTarget =
    activeTargetTileId == null
      ? null
      : normalizedTargets.find((target) => target.tileId === activeTargetTileId) ??
        null;

  if (activeTarget) {
    const activeDistanceSquared = getDistanceSquared(
      pointerX,
      pointerY,
      activeTarget
    );

    if (activeDistanceSquared <= releaseRadiusPx * releaseRadiusPx) {
      return activeTarget;
    }
  }

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

  return closestTarget;
}

export function getRobberPreviewLeanAngle(
  velocityX,
  maxLeanDegrees = ROBBER_PREVIEW_MAX_LEAN_DEGREES
) {
  if (!Number.isFinite(velocityX)) {
    return 0;
  }

  return Math.max(
    -maxLeanDegrees,
    Math.min(maxLeanDegrees, velocityX * 0.055)
  );
}

export function isPointInsidePointyHex({
  pointX,
  pointY,
  centerX,
  centerY,
  size
} = {}) {
  if (
    !Number.isFinite(pointX) ||
    !Number.isFinite(pointY) ||
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return false;
  }

  const offsetX = Math.abs(pointX - centerX);
  const offsetY = Math.abs(pointY - centerY);
  const halfHexWidth = (SQRT3 / 2) * size;

  if (offsetX > halfHexWidth || offsetY > size) {
    return false;
  }

  if (offsetY <= size / 2) {
    return true;
  }

  return offsetX <= (size - offsetY) * SQRT3;
}

export function isPointOverRobberBoardLand({
  pointX,
  pointY,
  landTileCenters = [],
  tileSize
} = {}) {
  if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) {
    return false;
  }

  return landTileCenters.some((tile) =>
    isPointInsidePointyHex({
      pointX,
      pointY,
      centerX: tile?.centerX,
      centerY: tile?.centerY,
      size: tileSize
    })
  );
}

export function getLockedRobberPreviewPosition({
  tileId,
  landTileCenters = [],
  boardTileSize
} = {}) {
  if (!Number.isFinite(tileId) || !Number.isFinite(boardTileSize)) {
    return null;
  }

  const tileCenter =
    landTileCenters.find((tile) => tile?.tileId === tileId) ?? null;
  if (!tileCenter) {
    return null;
  }

  return {
    x: tileCenter.centerX + boardTileSize * ROBBER_PREVIEW_LOCKED_OFFSET_X_FACTOR,
    y: tileCenter.centerY + boardTileSize * ROBBER_PREVIEW_LOCKED_OFFSET_Y_FACTOR
  };
}
