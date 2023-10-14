import React from "react";
import { tilePixelVector, getNodeDelta, SQRT3 } from "./utils/coordinates";
import { Piece } from "./Piece";


export function Node({
  tileId, //tileId
  nodeId,
  center,
  size,
  coordinate,
  direction,
  buildingType,
  buildingColor,
  flashing,
  onClick,
}) {
  //TOD remove this, just calculate it once in Board
  const [centerX, centerY] = center;
  const w = SQRT3 * size;
  const h = 2 * size;
  const [tileX, tileY] = tilePixelVector(coordinate, size, centerX, centerY);
  const [deltaX, deltaY] = getNodeDelta(direction, w, h);
  const x = tileX + deltaX;
  const y = tileY + deltaY;

  const width = size * 0.45;
  const height = size * 0.45;
  //onClick:
  //place settlement
    //then either do immediate road, or not
  //upgrade settlement to city
  //other CK stuff
  const buildingSVG = `/svgs/${buildingType}_${buildingColor}.svg`
  return (
//TODO: make this better
        <Piece
          buildingSVG={buildingSVG}
          size={size * 0.8} //this should really be in Piece.js
          left={x}
          top={y}
        />
  );
}
