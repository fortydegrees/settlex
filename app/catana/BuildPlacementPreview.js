import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { gsap } from "gsap";
import {
  getClassicSvgPath,
  getThemedSvgPath,
  handleThemeImageError
} from "./theme/themes";
import { getPieceSvgFile } from "./theme/pieceAssets.js";
import {
  getBuildPickupOrigin,
  getBuildPreviewFrame,
  getBuildPreviewLeanAngle,
  getBuildPreviewViewportScale,
  getMagneticBuildTarget,
  getScaledBuildPreviewSize
} from "./utils/buildPlacementPreviewMotion";

const PREVIEW_BASE_SIZE = 56;
const FREE_FOLLOW_SPRING = {
  stiffness: 150,
  damping: 24,
  mass: 1
};
const LOCKED_TARGET_SPRING = {
  stiffness: 220,
  damping: 28,
  mass: 1
};
const MAX_SPRING_STEP_SECONDS = 0.032;

const getViewportTargetCenters = (magneticTargets = []) =>
  magneticTargets
    .map((target) => {
      const rect =
        target?.element?.getBoundingClientRect?.() ??
        (Number.isFinite(target?.centerX) && Number.isFinite(target?.centerY)
          ? {
              left: target.centerX - (target.width ?? 0) / 2,
              top: target.centerY - (target.height ?? 0) / 2,
              width: target.width ?? 0,
              height: target.height ?? 0
            }
          : null);
      if (!rect) {
        return null;
      }

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
        return null;
      }

      return {
        id: target.id,
        centerX,
        centerY,
        width: rect.width,
        height: rect.height,
        rotationDegrees: target.rotationDegrees ?? 0
      };
    })
    .filter(Boolean);

const getPreviewAssetFile = (pieceType, pieceColor) => {
  if (pieceType === "road") {
    return getPieceSvgFile("road", pieceColor);
  }

  if (pieceType === "settlement") {
    return getPieceSvgFile("settlement", pieceColor);
  }

  if (pieceType === "city") {
    return getPieceSvgFile("city", pieceColor);
  }

  return null;
};

export function BuildPlacementPreview({
  active = false,
  pieceType = null,
  pieceColor = "red",
  originRect = null,
  magneticTargets = [],
  boardViewportScale = 1,
  themeId,
  size = PREVIEW_BASE_SIZE,
  prefersReducedMotion = false,
  hasCoarsePointer = false
}) {
  const previewRef = useRef(null);
  const previewShadowRef = useRef(null);
  const previewGraphicRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTickMsRef = useRef(null);
  const pointerRef = useRef({ x: null, y: null });
  const currentPositionRef = useRef({ x: null, y: null });
  const desiredPositionRef = useRef({ x: null, y: null });
  const velocityRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef(0);
  const desiredRotationRef = useRef(0);
  const activeTargetIdRef = useRef(null);
  const [hasPosition, setHasPosition] = useState(false);

  const reduceMotion = prefersReducedMotion || hasCoarsePointer;
  const previewViewportScale = getBuildPreviewViewportScale(boardViewportScale);
  const previewSize = getScaledBuildPreviewSize({
    baseSize: size,
    boardViewportScale: previewViewportScale
  });
  const previewFrame = useMemo(
    () => getBuildPreviewFrame(pieceType, previewSize),
    [pieceType, previewSize]
  );
  const assetFile = getPreviewAssetFile(pieceType, pieceColor);
  const previewSrc = assetFile ? getThemedSvgPath(themeId, assetFile) : null;
  const previewFallbackSrc = assetFile ? getClassicSvgPath(assetFile) : null;

  const syncDesiredPosition = useCallback(() => {
    const previewNode = previewRef.current;
    if (!active || !previewNode) {
      return;
    }

    const viewportTargets = getViewportTargetCenters(magneticTargets);
    const selectedTarget = getMagneticBuildTarget({
      pointerX: pointerRef.current.x,
      pointerY: pointerRef.current.y,
      targets: viewportTargets,
      activeTargetId: activeTargetIdRef.current
    });

    activeTargetIdRef.current = selectedTarget?.id ?? null;
    if (selectedTarget) {
      desiredPositionRef.current = {
        x: selectedTarget.centerX,
        y: selectedTarget.centerY
      };
      desiredRotationRef.current =
        pieceType === "road" ? selectedTarget.rotationDegrees ?? 90 : 0;
      setHasPosition(true);
      gsap.to(previewNode, { opacity: 1, duration: 0.1, overwrite: "auto" });
      return;
    }

    if (
      Number.isFinite(pointerRef.current.x) &&
      Number.isFinite(pointerRef.current.y)
    ) {
      desiredPositionRef.current = {
        x: pointerRef.current.x,
        y: pointerRef.current.y
      };
      desiredRotationRef.current = pieceType === "road" ? 90 : 0;
      setHasPosition(true);
      gsap.to(previewNode, { opacity: 1, duration: 0.1, overwrite: "auto" });
      return;
    }

    const origin = getBuildPickupOrigin(originRect);
    if (origin) {
      desiredPositionRef.current = origin;
      desiredRotationRef.current = pieceType === "road" ? 90 : 0;
      setHasPosition(true);
    }
  }, [active, magneticTargets, originRect, pieceType]);

  useEffect(() => {
    const previewNode = previewRef.current;
    const shadowNode = previewShadowRef.current;
    const graphicNode = previewGraphicRef.current;
    if (!active || !previewNode || !shadowNode || !graphicNode || !assetFile) {
      setHasPosition(false);
      activeTargetIdRef.current = null;
      currentPositionRef.current = { x: null, y: null };
      desiredPositionRef.current = { x: null, y: null };
      velocityRef.current = { x: 0, y: 0 };
      currentRotationRef.current = 0;
      desiredRotationRef.current = 0;
      return undefined;
    }

    const origin = getBuildPickupOrigin(originRect);
    currentPositionRef.current = origin ?? { x: null, y: null };
    desiredPositionRef.current = origin ?? { x: null, y: null };
    if (origin) {
      setHasPosition(true);
    }

    gsap.set(previewNode, {
      xPercent: -50,
      yPercent: -50,
      opacity: 0,
      scale: reduceMotion ? 1 : 0.88
    });
    gsap.set(shadowNode, {
      opacity: 0,
      scaleX: 0.85,
      scaleY: 0.7
    });
    gsap.set(graphicNode, {
      rotation: pieceType === "road" ? 90 : 0,
      transformOrigin: "50% 50%"
    });

    const updateDesiredFromPointer = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      syncDesiredPosition();

      if (reduceMotion) {
        const nextPosition = desiredPositionRef.current;
        if (
          Number.isFinite(nextPosition.x) &&
          Number.isFinite(nextPosition.y)
        ) {
          currentPositionRef.current = nextPosition;
          gsap.set(previewNode, nextPosition);
          gsap.set(graphicNode, {
            rotation: desiredRotationRef.current
          });
          gsap.set(shadowNode, { opacity: 0.44, scaleX: 1, scaleY: 0.92 });
          gsap.to(previewNode, {
            opacity: 1,
            scale: 1,
            duration: 0.08,
            ease: "power2.out",
            overwrite: "auto"
          });
        }
      }
    };

    window.addEventListener("pointermove", updateDesiredFromPointer);
    syncDesiredPosition();

    if (!reduceMotion) {
      gsap.to(previewNode, {
        opacity: 1,
        scale: 1,
        duration: 0.16,
        ease: "power2.out",
        overwrite: "auto"
      });

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

          const isLocked = activeTargetIdRef.current != null;
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
          const nextRotation =
            currentRotationRef.current +
            (desiredRotationRef.current - currentRotationRef.current) * 0.24;
          const leanAngle = getBuildPreviewLeanAngle(nextVelocityX);
          const shouldSnapToRest =
            Math.abs(desiredX - nextX) < 0.5 &&
            Math.abs(desiredY - nextY) < 0.5 &&
            Math.abs(nextVelocityX) < 5 &&
            Math.abs(nextVelocityY) < 5;
          const nextPosition = shouldSnapToRest
            ? { x: desiredX, y: desiredY }
            : { x: nextX, y: nextY };

          velocityRef.current = shouldSnapToRest
            ? { x: 0, y: 0 }
            : { x: nextVelocityX, y: nextVelocityY };
          currentPositionRef.current = nextPosition;
          currentRotationRef.current = nextRotation;

          gsap.set(previewNode, nextPosition);
          gsap.set(graphicNode, {
            rotation: nextRotation + (pieceType === "road" ? leanAngle * 0.25 : leanAngle)
          });
          gsap.set(shadowNode, {
            opacity: isLocked ? 0.52 : 0.36,
            scaleX: isLocked ? 1.06 : 0.96,
            scaleY: isLocked ? 0.92 : 0.84
          });
        } else {
          lastTickMsRef.current = tickMs;
        }

        animationFrameRef.current = requestAnimationFrame(step);
      };

      animationFrameRef.current = requestAnimationFrame(step);
    }

    return () => {
      window.removeEventListener("pointermove", updateDesiredFromPointer);
      if (animationFrameRef.current != null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = null;
      lastTickMsRef.current = null;
      gsap.killTweensOf(previewNode);
      gsap.killTweensOf(shadowNode);
      gsap.killTweensOf(graphicNode);
    };
  }, [
    active,
    assetFile,
    originRect,
    pieceType,
    reduceMotion,
    syncDesiredPosition
  ]);

  useEffect(() => {
    if (!active) {
      return;
    }

    syncDesiredPosition();
  }, [active, magneticTargets, originRect, syncDesiredPosition]);

  if (!active || !assetFile || typeof document === "undefined") {
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
        width: previewFrame.width,
        height: previewFrame.height,
        pointerEvents: "none",
        zIndex: 1001,
        opacity: hasPosition ? 1 : 0,
        filter: "drop-shadow(0 8px 18px rgba(15, 23, 42, 0.2))"
      }}
    >
      <div
        ref={previewShadowRef}
        style={{
          position: "absolute",
          left: "50%",
          bottom: "-10%",
          width: pieceType === "road" ? "74%" : "58%",
          height: pieceType === "road" ? "32%" : "22%",
          borderRadius: 999,
          background:
            "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.5) 0%, rgba(15, 23, 42, 0.18) 56%, rgba(15, 23, 42, 0) 100%)",
          transform: "translate(-50%, 0)",
          filter: "blur(6px)"
        }}
      />
      <div
        ref={previewGraphicRef}
        style={{
          position: "absolute",
          left: 0,
          top: previewFrame.offsetY,
          width: "100%",
          height: "100%",
          transform: `scale(${pieceType === "road" ? 1 : previewViewportScale})`,
          transformOrigin: "50% 50%"
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt="Build placement preview"
          style={{ width: "100%", height: "100%" }}
          draggable={false}
          onError={(event) => handleThemeImageError(event, previewFallbackSrc)}
        />
      </div>
    </div>,
    document.body
  );
}
