import React from "react";
import { Edge } from "../Edge";
import { Node } from "../Node";

export function HomeDemoPieceLayer({
  pieceState,
  renderMaps,
  playerColorMap,
  center,
  size,
  themeId
}) {
  const roads = Object.values(pieceState?.roadsByEdgeId ?? {}).map((road) => {
    const renderEdge = renderMaps.edgeRenderById[road.edgeId];
    const color = playerColorMap[road.playerId];
    if (!renderEdge || !color) return null;

    return (
      <Edge
        key={`demo-road-${road.edgeId}`}
        id={`demo-road-${road.edgeId}`}
        center={center}
        size={size}
        coordinate={renderEdge.tile_coordinate}
        direction={renderEdge.direction}
        color={color}
        themeId={themeId}
      />
    );
  });

  const buildings = Object.values(pieceState?.buildingsByNodeId ?? {}).map(
    (building) => {
      const renderNode = renderMaps.nodeRenderById[String(building.nodeId)];
      const color = playerColorMap[building.playerId];
      if (!renderNode || !color) return null;

      return (
        <Node
          key={`demo-building-${building.nodeId}`}
          nodeId={building.nodeId}
          tileId={renderNode.tileId}
          center={center}
          size={size}
          coordinate={renderNode.tile_coordinate}
          direction={renderNode.direction}
          buildingType={building.type}
          buildingColor={color}
          themeId={themeId}
        />
      );
    }
  );

  return (
    <div
      aria-hidden="true"
      data-testid="home-demo-piece-layer"
      className="pointer-events-none absolute inset-0 z-20"
    >
      {roads}
      {buildings}
    </div>
  );
}
