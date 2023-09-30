import React from "react";
import { motion, useAnimation } from "framer-motion";
import { tilePixelVector, getNodeDelta, SQRT3 } from "./utils/coordinates";

function Building({ building, color }) {
  const type = building === "CITY" ? "city" : "settlement";

  if (type == "settlement"){
    return <div></div>
  }
  return <div className={(color, type)}></div>;
}

export function Node({
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
      className={flashing ? "animate-pulse" : "node"}
      // variants={{
        
      //   pulse: {
      //     scale:1.5,
      //     transition: { repeat: Infinity, repeatType: "reverse" },
      //   },
      // }}
      //animate={"pulse"}
      style={{
        position: 'absolute',
        cursor: 'pointer',
        width: size * 0.4,
        height: size * 0.4,
        left: x ,
        top: y,
        transform: `translateY(-50%) translateX(-50%)`,
        borderRadius: 100,
        backgroundColor: 'white',
      }}
      onClick={onClick}
    >
      {color && <Building building={building} color={color} />}
       {/* <span>{nodeId}</span> */}
    </div>
  );
}
