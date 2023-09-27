import React from "react";
import { motion, useAnimation } from "framer-motion";
import { tilePixelVector, getNodeDelta, SQRT3 } from "./utils/coordinates";


export function Building({
  center,
  size,
  coordinate,
  direction,
  building,
  color,
  onClick,
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

  return (
    <div
      className="node"
      style={{
        width: size * 0.45,
        height: size * 0.45,
        left: x ,
        top: y,
        transform: `translateY(-50%) translateX(-50%)`,
        backgroundColor: color,
      }}
      onClick={onClick}
    >
        <div></div>
    </div>
  );
}
