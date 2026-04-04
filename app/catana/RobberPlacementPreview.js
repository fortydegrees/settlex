import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { gsap } from "gsap";
import {
  getClassicSvgPath,
  getThemedSvgPath,
  handleThemeImageError
} from "./theme/themes";
import {
  getRobberPreviewViewportScale,
  getScaledRobberPreviewSize,
  getLockedRobberPreviewPosition,
  getMagneticRobberTarget,
  getRobberPreviewLeanAngle,
  isPointOverRobberBoardLand
} from "./utils/robberPlacementPreviewMotion";

const PREVIEW_SIZE_PX = 56;
const PREVIEW_HEAD_TRACK_Y_PERCENT = -28;
const PREVIEW_HEAD_ROTATION_ORIGIN = "50% 28%";
const PREVIEW_SHADOW_TOP_PERCENT = 102;
const PREVIEW_SHADOW_WIDTH_PERCENT = 82;
const PREVIEW_SHADOW_HEIGHT_PERCENT = 24;
const PREVIEW_SHADOW_GROUND_OFFSET_FACTOR = 0.68;
const PREVIEW_SHADOW_BASE_OPACITY = 0.84;
const PREVIEW_SHADOW_BLUR_PX = 6;
const FREE_FOLLOW_SPRING = {
  stiffness: 140,
  damping: 24,
  mass: 1
};
const LOCKED_TARGET_SPRING = {
  stiffness: 220,
  damping: 30,
  mass: 1
};
const LEAN_SPRING = {
  stiffness: 420,
  damping: 14,
  mass: 1
};
const MAX_SPRING_STEP_SECONDS = 0.032;

const hasValidCenter = (hoveredTarget) =>
  Number.isFinite(hoveredTarget?.centerX) &&
  Number.isFinite(hoveredTarget?.centerY);

const getViewportTargetCenters = (magneticTargets) =>
  magneticTargets
    .map((target) => {
      const rect = target?.element?.getBoundingClientRect?.();
      if (!rect) {
        return null;
      }

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
        return null;
      }

      return {
        tileId: target.tileId,
        centerX,
        centerY,
        width: rect.width,
        height: rect.height
      };
    })
    .filter(Boolean);

export function RobberPlacementPreview({
  active = false,
  hoveredTarget = null,
  magneticTargets = [],
  landTileCenters = [],
  boardTileSize,
  boardViewportScale = 1,
  themeId,
  size = PREVIEW_SIZE_PX
}) {
  const previewRef = useRef(null);
  const previewShadowRef = useRef(null);
  const previewGraphicRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTickMsRef = useRef(null);
  const pointerRef = useRef({ x: null, y: null });
  const currentPositionRef = useRef({ x: null, y: null });
  const velocityRef = useRef({ x: 0, y: 0 });
  const leanAngleRef = useRef(0);
  const leanVelocityRef = useRef(0);
  const desiredPositionRef = useRef({ x: null, y: null });
  const activeTargetTileIdRef = useRef(null);
  const lastLockedTargetTileIdRef = useRef(null);
  const effectivePreviewSizeRef = useRef(
    getScaledRobberPreviewSize({
      baseSize: size,
      boardViewportScale
    })
  );
  const [hasPosition, setHasPosition] = useState(false);
  const previewViewportScale = getRobberPreviewViewportScale(boardViewportScale);

  const robberSrc = getThemedSvgPath(themeId, "icon_robber.svg");
  const robberFallbackSrc = getClassicSvgPath("icon_robber.svg");

  useEffect(() => {
    effectivePreviewSizeRef.current = getScaledRobberPreviewSize({
      baseSize: size,
      boardViewportScale: previewViewportScale
    });
  }, [boardViewportScale, previewViewportScale, size]);

  const syncDesiredPosition = useCallback(() => {
    const node = previewRef.current;
    if (!active || !node) {
      return;
    }

    let selectedTarget = hasValidCenter(hoveredTarget) ? hoveredTarget : null;
    if (!selectedTarget) {
      selectedTarget = getMagneticRobberTarget({
        pointerX: pointerRef.current.x,
        pointerY: pointerRef.current.y,
        targets: getViewportTargetCenters(magneticTargets),
        activeTargetTileId: activeTargetTileIdRef.current
      });
    }

    activeTargetTileIdRef.current = selectedTarget?.tileId ?? null;
    if (selectedTarget) {
      desiredPositionRef.current =
        getLockedRobberPreviewPosition({
          tileId: selectedTarget.tileId,
          landTileCenters,
          boardTileSize
        }) ?? {
          x: selectedTarget.centerX,
          y: selectedTarget.centerY
        };
      setHasPosition(true);
      gsap.to(node, { opacity: 1, duration: 0.12, overwrite: "auto" });

      if (lastLockedTargetTileIdRef.current !== selectedTarget.tileId) {
        lastLockedTargetTileIdRef.current = selectedTarget.tileId;
        gsap.fromTo(
          node,
          { scale: 1 },
          {
            scale: 1.08,
            duration: 0.18,
            yoyo: true,
            repeat: 1,
            ease: "power2.out",
            overwrite: "auto"
          }
        );
      }

      return;
    }

    lastLockedTargetTileIdRef.current = null;

    if (
      Number.isFinite(pointerRef.current.x) &&
      Number.isFinite(pointerRef.current.y)
    ) {
      desiredPositionRef.current = {
        x: pointerRef.current.x,
        y: pointerRef.current.y
      };
      setHasPosition(true);
      gsap.to(node, { opacity: 1, duration: 0.12, overwrite: "auto" });
    }
  }, [active, boardTileSize, hoveredTarget, landTileCenters, magneticTargets]);

  useEffect(() => {
    const node = previewRef.current;
    const shadowNode = previewShadowRef.current;
    const graphicNode = previewGraphicRef.current;
    if (!active || !node || !shadowNode || !graphicNode) {
      setHasPosition(false);
      lastLockedTargetTileIdRef.current = null;
      activeTargetTileIdRef.current = null;
      currentPositionRef.current = { x: null, y: null };
      desiredPositionRef.current = { x: null, y: null };
      velocityRef.current = { x: 0, y: 0 };
      leanAngleRef.current = 0;
      leanVelocityRef.current = 0;
      return undefined;
    }

    gsap.set(node, {
      xPercent: -50,
      yPercent: PREVIEW_HEAD_TRACK_Y_PERCENT,
      opacity: 0,
      scale: 1
    });
    gsap.set(shadowNode, {
      opacity: 0,
      scaleX: 0.82,
      scaleY: 0.72
    });
    gsap.set(graphicNode, {
      transformOrigin: PREVIEW_HEAD_ROTATION_ORIGIN,
      rotation: 0
    });

    const handlePointerMove = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      syncDesiredPosition();
    };

    window.addEventListener("pointermove", handlePointerMove);

    const step = (tickMs) => {
      const desiredX = desiredPositionRef.current.x;
      const desiredY = desiredPositionRef.current.y;
      if (Number.isFinite(desiredX) && Number.isFinite(desiredY)) {
        const lastTickMs = lastTickMsRef.current ?? tickMs;
        const deltaSeconds = Math.min(
          (tickMs - lastTickMs) / 1000,
          MAX_SPRING_STEP_SECONDS
        );
        lastTickMsRef.current = tickMs;

        if (
          !Number.isFinite(currentPositionRef.current.x) ||
          !Number.isFinite(currentPositionRef.current.y)
        ) {
          currentPositionRef.current = { x: desiredX, y: desiredY };
          velocityRef.current = { x: 0, y: 0 };
        }

        const isLocked = activeTargetTileIdRef.current != null;
        const spring = isLocked ? LOCKED_TARGET_SPRING : FREE_FOLLOW_SPRING;
        const nextVelocityX =
          velocityRef.current.x +
          ((desiredX - currentPositionRef.current.x) * spring.stiffness -
            velocityRef.current.x * spring.damping) *
            (deltaSeconds / spring.mass);
        const nextVelocityY =
          velocityRef.current.y +
          ((desiredY - currentPositionRef.current.y) * spring.stiffness -
            velocityRef.current.y * spring.damping) *
            (deltaSeconds / spring.mass);
        const nextX =
          currentPositionRef.current.x + nextVelocityX * deltaSeconds;
        const nextY =
          currentPositionRef.current.y + nextVelocityY * deltaSeconds;
        const leanTarget = getRobberPreviewLeanAngle(nextVelocityX);
        const nextLeanVelocity =
          leanVelocityRef.current +
          ((leanTarget - leanAngleRef.current) * LEAN_SPRING.stiffness -
            leanVelocityRef.current * LEAN_SPRING.damping) *
            (deltaSeconds / LEAN_SPRING.mass);
        const nextLeanAngle =
          leanAngleRef.current + nextLeanVelocity * deltaSeconds;
        const shouldSnapToRest =
          Math.abs(desiredX - nextX) < 0.5 &&
          Math.abs(desiredY - nextY) < 0.5 &&
          Math.abs(nextVelocityX) < 5 &&
          Math.abs(nextVelocityY) < 5;

        velocityRef.current = shouldSnapToRest
          ? { x: 0, y: 0 }
          : { x: nextVelocityX, y: nextVelocityY };
        leanVelocityRef.current =
          Math.abs(leanTarget - nextLeanAngle) < 0.1 &&
          Math.abs(nextLeanVelocity) < 2
            ? 0
            : nextLeanVelocity;
        leanAngleRef.current =
          Math.abs(leanTarget - nextLeanAngle) < 0.1 &&
          Math.abs(nextLeanVelocity) < 2
            ? leanTarget
            : nextLeanAngle;
        const nextPosition = shouldSnapToRest
          ? { x: desiredX, y: desiredY }
          : { x: nextX, y: nextY };
        const boardShadowVisible = isPointOverRobberBoardLand({
          pointX: nextPosition.x,
          pointY:
            nextPosition.y +
            effectivePreviewSizeRef.current *
              PREVIEW_SHADOW_GROUND_OFFSET_FACTOR,
          landTileCenters,
          tileSize: boardTileSize
        });
        const leanStrength = Math.min(Math.abs(leanAngleRef.current) / 60, 1);
        currentPositionRef.current = nextPosition;
        gsap.set(node, nextPosition);
        gsap.set(shadowNode, {
          opacity: boardShadowVisible ? PREVIEW_SHADOW_BASE_OPACITY : 0,
          scaleX: boardShadowVisible ? 1 + leanStrength * 0.16 : 0.82,
          scaleY: boardShadowVisible ? 1 - leanStrength * 0.08 : 0.72
        });
        gsap.set(graphicNode, {
          rotation: leanAngleRef.current
        });
      } else {
        lastTickMsRef.current = tickMs;
      }

      animationFrameRef.current = requestAnimationFrame(step);
    };

    syncDesiredPosition();
    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (animationFrameRef.current != null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = null;
      lastTickMsRef.current = null;
      gsap.killTweensOf(node);
      gsap.killTweensOf(shadowNode);
      gsap.killTweensOf(graphicNode);
    };
  }, [
    active,
    boardTileSize,
    hoveredTarget,
    landTileCenters,
    magneticTargets,
    size,
    syncDesiredPosition
  ]);

  useEffect(() => {
    if (!active) {
      return;
    }

    syncDesiredPosition();
  }, [
    active,
    hoveredTarget,
    landTileCenters,
    magneticTargets,
    syncDesiredPosition
  ]);

  if (!active || typeof document === "undefined") {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      ref={previewRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: size,
        height: size,
        pointerEvents: "none",
        zIndex: 1001,
        opacity: hasPosition ? 1 : 0,
        filter: "drop-shadow(0 8px 16px rgba(15, 23, 42, 0.18))"
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${previewViewportScale})`,
          transformOrigin: PREVIEW_HEAD_ROTATION_ORIGIN
        }}
      >
        <div
          ref={previewShadowRef}
          style={{
            position: "absolute",
            left: "50%",
            top: `${PREVIEW_SHADOW_TOP_PERCENT}%`,
            width: `${PREVIEW_SHADOW_WIDTH_PERCENT}%`,
            height: `${PREVIEW_SHADOW_HEIGHT_PERCENT}%`,
            borderRadius: 999,
            background:
              "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.58) 0%, rgba(15, 23, 42, 0.28) 48%, rgba(15, 23, 42, 0.12) 72%, rgba(15, 23, 42, 0) 100%)",
            transform: "translate(-50%, 0)",
            filter: `blur(${PREVIEW_SHADOW_BLUR_PX}px)`
          }}
        />
        <div
          ref={previewGraphicRef}
          style={{
            width: "100%",
            height: "100%"
          }}
        >
          {/* Decorative preview image; keep raw img to match existing themed asset usage. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={robberSrc}
            alt="Robber placement preview"
            style={{ width: "100%", height: "100%" }}
            draggable={false}
            onError={(event) => handleThemeImageError(event, robberFallbackSrc)}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
