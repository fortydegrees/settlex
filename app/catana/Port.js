import React, { useState, useRef } from "react";

import { SQRT3, tilePixelVector } from "./utils/coordinates";
import {
  STANDARD_RESOURCES,
  RESOURCE_SVGS,
  ResourceType,
} from "../board-editor/utils/types";
import { useDrag } from "react-dnd";
import "./Tile.css";

export function Port({
  id,
  coordinate,
  type,
  resource,
  size = 50,
  absolute,
  boardCenter,
  draggable,
tile
}) {
  const w = SQRT3 * size;
  const h = 2 * size;
  const [centerX, centerY] = boardCenter;
  const [x, y] = tilePixelVector(coordinate, size, centerX, centerY);



const direction = tile.direction

  const connectorStyles = {
    NORTH: {
      left: x - w * 0.4,
      top: y - h * 0.8,
      transform: "rotate(0deg) scale(0.3)",
    },
    SOUTH: {
      left: x - w * 0.4,
      top: y - h * 0.2,
      transform: "rotate(0deg) scale(0.3)",
    },
    NORTHEAST: {
      left: x - w * 0.15,
      top: y - h / 1.75,
      transform: "rotate(60deg) scale(0.3)",
    },
    NORTHWEST: {
      left: x - w * 0.75,
      top: y - h / 1.4,
      transform: "rotate(-60deg) scale(0.3)",
    },
    SOUTHWEST: {
      left: x - w * 0.75,
      top: y - h / 3.6,
      transform: "rotate(60deg) scale(0.3)",
    },
    SOUTHEAST: {
      left: x - w * 0.15,
      top: y - h * 0.4,
      transform: "rotate(-60deg) scale(0.3)",
    },
  };
  

  const directionConnectors = {
    "EAST": [ connectorStyles['NORTHWEST'],connectorStyles['SOUTHWEST']],
    "NORTHEAST":  [ connectorStyles['SOUTH'],connectorStyles['SOUTHWEST']],
    "NORTHWEST": [ connectorStyles['SOUTH'],connectorStyles['SOUTHEAST']],
    "WEST": [ connectorStyles['NORTHEAST'],connectorStyles['SOUTHEAST']],
    "SOUTHWEST": [ connectorStyles['NORTH'],connectorStyles['NORTHEAST']],
    "SOUTHEAST": [ connectorStyles['NORTH'],connectorStyles['NORTHWEST']],
}


  return (
    <>
      <div
        className="hex"
        ref={draggable ? drag : null}

        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: w,
          height: h,
          backgroundImage: `url('/svgs/port_${tile.resource}.svg')`,
          //port_pier
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          position: "absolute",
          left: x - w / 2,
          top: y - h / 2,
          transform: "scale(0.5)",
          zIndex: 1,
          //opacity: resource === "Empty" ? 0.3 : 1,
        }}
      />
      <div
        //className="hex"
        ref={draggable ? drag : null}

        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: w,
          height: h,
          backgroundImage: `url('/svgs/port_pier.svg')`,
          //port_pier
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          position: "absolute",
...directionConnectors[direction][0]
          //opacity: resource === "Empty" ? 0.3 : 1,
        }}
      />
       <div
        //className="hex"
        ref={draggable ? drag : null}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: w,
          height: h,
          backgroundImage: `url('/svgs/port_pier.svg')`,
          //port_pier
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          position: "absolute",
...directionConnectors[direction][1]
          //opacity: resource === "Empty" ? 0.3 : 1,
        }}
      />
    </>
  );
}

/*
flashing anim: https://codepen.io/h7w/pen/bGGOyyj
other flashes: https://codepen.io/emmawalden/pen/qBOZXGa https://codepen.io/paigen11/pen/VwKZGMp
*/
