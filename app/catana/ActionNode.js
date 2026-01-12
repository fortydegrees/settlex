import React from "react";
import {
  tilePixelVector,
  getNodeDelta,
  getEdgeDelta,
  SQRT3,
} from "./utils/coordinates";
import { Piece } from "./Piece";

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
}) {
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

  const gradientClass = isHovered && isNodeType
    ? "[background-image:radial-gradient(70%_70%_at_50%_50%,_rgba(0,0,0,0.7)_0%,_rgba(0,0,0,0)_100%)]"
    : "[background-image:radial-gradient(50%_50%_at_50%_50%,_rgba(255,255,255,0.7)_0%,_rgba(255,255,255,0)_100%)]";

  return (
    <>
      <div
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
          opacity: hoveredNode ? (isHovered ? 1 : 0.4) : 0.8,
          zIndex: 2,
        }}
        onClick={onClick}
        onMouseEnter={() => setHoveredNode(nodeId)}
        onMouseLeave={() => setHoveredNode(null)}
      />
      {isHovered && (
        isNodeType ? (
          <Piece
            buildingSVG={`/svgs/${buildingType}_${buildingColor}.svg`}
            size={size * 0.8}
            left={x}
            top={y}
            placing
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
