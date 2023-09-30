import React, { useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { tilePixelVector, getNodeDelta, SQRT3 } from "./utils/coordinates";
import { Piece } from "./Piece";
function Building({ building, color }) {
  const type = building === "CITY" ? "city" : "settlement";

  if (type == "settlement") {
    return (
      <Piece
        absolute
        svg="https://colonist.io/dist/images/settlement_red.svg?v168"
        size={40}
      />
    );
  }
  return <div className={(color, type)}></div>;
}

export function ActionNode({
  tileId, //tileId
  nodeId,
  center,
  size,
  coordinate,
  direction,
  building,
  color,
  flashing,
  onClick,
  setHoveredNode,
  hoveredNode,
}) {
  const [centerX, centerY] = center;
  const w = SQRT3 * size;
  const h = 2 * size;
  const [tileX, tileY] = tilePixelVector(coordinate, size, centerX, centerY);
  const [deltaX, deltaY] = getNodeDelta(direction, w, h);
  const x = tileX + deltaX;
  const y = tileY + deltaY;

  //onClick:
  //place settlement
  //then either do immediate road, or not
  //upgrade settlement to city
  //other CK stuff

  const width = size * 0.45;
  const height = size * 0.45;

  //TODO: disable animation for all others when a node is hovered?
  //        tried naive implementation but it restarts animations at different times so looks weird
  return (
    <>
      <div
        className={`${
          hoveredNode == nodeId
            ? "[background-image:radial-gradient(70%_70%_at_50%_50%,_rgba(0,0,0,0.7)_0%,_rgba(0,0,0,0)_100%)]"
            : "[background-image:radial-gradient(50%_50%_at_50%_50%,_rgba(255,255,255,0.7)_0%,_rgba(255,255,255,0)_100%)] "
        } animation-pulse`}
        //className={flashing ? "hover-opacity bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-300 to-transparent animation-pulse" : "hover-opacity"}

        style={{
          position: "absolute",
          cursor: "pointer",
          width: width,
          height: height,
          left: x - width / 2,
          top: y - height / 2,
          borderRadius: 100,
          borderColor: "#FFFFFF",
          borderWidth: 1.2,
          //fillOpacity:0.2
          opacity: hoveredNode ? (hoveredNode == nodeId ? 1 : 0.4) : 0.8,
          //opacity: (hoveredNode ? 1 : 0.5),
        }}
        onClick={onClick}
        onMouseEnter={() => setHoveredNode(nodeId)}
        onMouseLeave={() => setHoveredNode(null)}
      ></div>
      {hoveredNode == nodeId && (
        <Piece
          svg="https://colonist.io/dist/images/settlement_red.svg?v168"
          size={40}
          left={x}
          top={y}
        />
      )}
    </>
  );
}
