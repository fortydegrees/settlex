import React from "react";
import {
  tilePixelVector,
  getNodeDelta,
  getEdgeDelta,
  SQRT3,
} from "./utils/coordinates";
import { Piece } from "./Piece";
import { getClassicSvgPath, getThemedSvgPath } from "./theme/themes";
import { getPieceSvgFile } from "./theme/pieceAssets.js";

export function ActionNode({
  nodeId,
  center,
  size,
  coordinate,
  direction,
  onClick,
  setHoveredNode,
  hoveredNode,
  type = "node",
  piece,
  buildingType,
  buildingColor,
  showIdleCircle = true,
  registerBuildTarget = null,
  showRegisteredHoverPreview = false,
  buildTargetMeta = null,
  themeId,
}) {
  const actionCircleRef = React.useRef(null);
  const [centerX, centerY] = center;
  const w = SQRT3 * size;
  const h = 2 * size;
  const [tileX, tileY] = tilePixelVector(coordinate, size, centerX, centerY);
  const [deltaX, deltaY] =
    type === "node"
      ? getNodeDelta(direction, w, h)
      : getEdgeDelta(direction, w, h);
  const x = tileX + deltaX;
  const y = tileY + deltaY;

  const actionSize = size * 0.4;
  const isHovered = hoveredNode === nodeId;
  const isNodeType = type === "node";
  const isCity = buildingType === "city";
  const isActivePreviewTarget = isHovered || showRegisteredHoverPreview;
  const buildingFile =
    buildingType && buildingColor
      ? getPieceSvgFile(buildingType, buildingColor)
      : null;
  const showCircleVisual = showIdleCircle || isActivePreviewTarget;
  const buildTargetRotationDegrees = buildTargetMeta?.rotationDegrees ?? 0;
  const showPiecePreview =
    showRegisteredHoverPreview || (!registerBuildTarget && isHovered);

  const gradientClass = isActivePreviewTarget && isNodeType
    ? "[background-image:radial-gradient(70%_70%_at_50%_50%,_rgba(0,0,0,0.7)_0%,_rgba(0,0,0,0)_100%)]"
    : "[background-image:radial-gradient(50%_50%_at_50%_50%,_rgba(255,255,255,0.7)_0%,_rgba(255,255,255,0)_100%)]";

  React.useEffect(() => {
    if (!registerBuildTarget) {
      return undefined;
    }

    registerBuildTarget({
      targetId: nodeId,
      element: actionCircleRef.current,
      rotationDegrees: buildTargetRotationDegrees
    });

    return () => {
      registerBuildTarget({
        targetId: nodeId,
        element: null,
        rotationDegrees: buildTargetRotationDegrees
      });
    };
  }, [buildTargetRotationDegrees, nodeId, registerBuildTarget]);

  return (
    <>
      <div
        ref={actionCircleRef}
        className={`${gradientClass} animation-pulse`}
        data-action-circle="true"
        style={{
          position: "absolute",
          cursor: "pointer",
          width: actionSize,
          height: actionSize,
          left: x - actionSize / 2,
          top: y - actionSize / 2,
          borderRadius: 100,
          borderColor: "#FFFFFF",
          borderWidth: 1.2,
          opacity: showCircleVisual
            ? hoveredNode != null || showRegisteredHoverPreview
              ? isActivePreviewTarget
                ? 1
                : 0.4
              : 0.8
            : 0,
          zIndex: 2,
        }}
        onClick={onClick}
        onMouseEnter={() => setHoveredNode(nodeId)}
        onMouseLeave={() => setHoveredNode(null)}
      />
      {showPiecePreview && (
        isNodeType ? (
          <Piece
            buildingSVG={getThemedSvgPath(themeId, buildingFile)}
            buildingSVGFallback={getClassicSvgPath(buildingFile)}
            size={size * 0.8}
            left={x}
            top={y}
            placing={!isCity}
            highlight={isCity}
          />
        ) : (
          // this is actually used for roads (ActionNode is reused)
          // though usually roads use Edge component with placing=true
          // if we ever use ActionNode for edges, we need to handle SVG logic
          piece
        )
      )}
    </>
  );
}
