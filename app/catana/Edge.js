import React from "react";

import { tilePixelVector, getEdgeTransform } from "./utils/coordinates";
import useWindowSize from "./utils/useWindowSize";
import { ActionNode } from "./ActionNode";

function Road({ color, size, tileX, tileY, transform }) {
  return (
    <div
      className="opacity-animation"
      style={{
        transform,
        backgroundImage: `url('/svgs/road_${color}.svg')`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        position: "absolute",
        width: size,
        height: size * 0.2,
        left: tileX,
        top: tileY,
      }}
    />
  );
}

function PlacedRoad({ id, color, size, tileX, tileY, transform }) {
  return (
    <div
      id={id}
      style={{
        transform,
        backgroundImage: `url('/svgs/road_${color}.svg')`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        position: "absolute",
        pointerEvents: "none",
        width: size,
        height: size * 0.2,
        left: tileX,
        top: tileY,
      }}
    />
  );
}

function PlaceableEdge({
  id,
  center,
  size,
  coordinate,
  direction,
  color,
  initialPlacement,
  hoveredNode,
  setHoveredNode,
  onPlace,
}) {
  const { width } = useWindowSize();
  const [centerX, centerY] = center;
  const [tileX, tileY] = tilePixelVector(coordinate, size, centerX, centerY);
  const transform = getEdgeTransform(direction, size, width);

  const showRoadOutline = initialPlacement && !hoveredNode;
  const isHovered = hoveredNode === id;

  return (
    <>
      {showRoadOutline && (
        <Road
          color={color}
          size={size}
          tileX={tileX}
          tileY={tileY}
          transform={transform}
        />
      )}

      <ActionNode
        nodeId={id}
        center={center}
        size={size}
        coordinate={coordinate}
        direction={direction}
        type="edge"
        piece={
          isHovered ? (
            <Road
              color={color}
              size={size}
              tileX={tileX}
              tileY={tileY}
              transform={transform}
            />
          ) : null
        }
        onClick={(event) => {
          event.stopPropagation();
          onPlace(id);
        }}
        setHoveredNode={setHoveredNode}
        hoveredNode={hoveredNode}
      />
    </>
  );
}

// HoverableEdge: shows preview only when this specific edge is hovered
// Used for passive "hover to preview, click to build" interaction
function HoverableEdge({
  id,
  center,
  size,
  coordinate,
  direction,
  color,
  hoveredEdge,
  setHoveredEdge,
  onPlace,
}) {
  const { width } = useWindowSize();
  const [centerX, centerY] = center;
  const [tileX, tileY] = tilePixelVector(coordinate, size, centerX, centerY);
  const transform = getEdgeTransform(direction, size, width);

  const isHovered = hoveredEdge === id;

  // Only render the ActionNode (invisible hit area), show road preview only when hovered
  return (
    <>
      {isHovered && (
        <Road
          color={color}
          size={size}
          tileX={tileX}
          tileY={tileY}
          transform={transform}
        />
      )}

      <ActionNode
        nodeId={id}
        center={center}
        size={size}
        coordinate={coordinate}
        direction={direction}
        type="edge"
        piece={null}
        onClick={(event) => {
          event.stopPropagation();
          onPlace(id);
        }}
        setHoveredNode={setHoveredEdge}
        hoveredNode={hoveredEdge}
      />
    </>
  );
}

export function Edge({
  id,
  center,
  size,
  coordinate,
  direction,
  color,
  placing = false,
  initialPlacement = false,
  roadBuilding = false,
  hoverable = false,
  hoveredNode,
  setHoveredNode,
  moves,
  setPlayerAction,
  onPlaceCommitted,
}) {
  const { width } = useWindowSize();
  const [centerX, centerY] = center;
  const [tileX, tileY] = tilePixelVector(coordinate, size, centerX, centerY);
  const transform = getEdgeTransform(direction, size, width);

  if (placing) {
    return (
      <PlaceableEdge
        id={id}
        center={center}
        size={size}
        coordinate={coordinate}
        direction={direction}
        color={color}
        initialPlacement={initialPlacement}
        hoveredNode={hoveredNode}
        setHoveredNode={setHoveredNode}
        onPlace={(edgeId) => {
          onPlaceCommitted?.();
          if (roadBuilding) {
            moves.placeRoadFromDevCard(edgeId);
          } else {
            moves.placeRoad(edgeId);
          }
          setHoveredNode(null);
          if (setPlayerAction && !roadBuilding) setPlayerAction(null);
        }}
      />
    );
  }

  if (hoverable) {
    return (
      <HoverableEdge
        id={id}
        center={center}
        size={size}
        coordinate={coordinate}
        direction={direction}
        color={color}
        hoveredEdge={hoveredNode}
        setHoveredEdge={setHoveredNode}
        onPlace={(edgeId) => {
          onPlaceCommitted?.();
          moves.placeRoad(edgeId);
          setHoveredNode(null);
        }}
      />
    );
  }

  return (
    <PlacedRoad
      id={id}
      color={color}
      size={size}
      tileX={tileX}
      tileY={tileY}
      transform={transform}
    />
  );
}
