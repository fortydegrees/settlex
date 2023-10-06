import React, { useState, useRef } from "react";

import { SQRT3, tilePixelVector } from "./utils/coordinates";
import {
  STANDARD_RESOURCES,
  RESOURCE_SVGS,
  ResourceType,
} from "../board-editor/utils/types";
import { useDrag } from "react-dnd";
import "./Tile.css";
import { EffectsBoardWrapper, useEffectListener } from "bgio-effects/react";
import { useSpring, animated, useChain, useSpringRef } from "@react-spring/web";

const numberToPips = (number) => {
  switch (number) {
    case 2:
    case 12:
      return "•";
    case 3:
    case 11:
      return "••";
    case 4:
    case 10:
      return "•••";
    case 5:
    case 9:
      return "••••";
    case 6:
    case 8:
      return "•••••";
    default:
      return "";
  }
};

export const CardAnim = ({ left, top, size }) => {
  const width = size * 0.5;
  const height = size * 0.7;


 const popRef = useSpringRef()
  const popSpring = useSpring({
    ref: popRef,
    from: { x: 0,  moveX: 0 },
    to: { x: 1, moveX: 40 },
    config: { mass: 1, friction: 20 },
    //config: { duration: 200 }
  });


  const moveRef = useSpringRef();
  const second = useSpring({
    ref: moveRef,
    from: { y: top, x: left - width / 2, },
    to: { y: 0, x: 1000 },
    config: { mass: 1, friction: 20 },
    //config: { duration: 200 }
  });



  useChain([popRef, moveRef], [0, 1], 800);

  return (
    <animated.div
      className="rounded border-2 border-white p-2 bg-green-500 drop-shadow-lg"
      style={{
        position: "absolute",
        left: second.x,
        top: second.y,
        zIndex: 5,

        width: width,
        height: height,
        transform: popSpring.x
          .to({
            range: [0, 0.5, 0.75, 1],
            output: [0.01, 0.65, 1.3, 1],
          })
          .to((x) => `scale(${x}) translateX(0%) translateY(0%)`),

        //pointerEvents: "none",
      }}
      
    />
  );
};

export function NumberToken({ number, style, size }) {
  const pips = numberToPips(number);
  let numberColor = "text-black";
  if (number == 6 || number == 8) {
    numberColor = "text-red-600";
  }
  return (
    <div
      className={`noselect drop-shadow-md bg-slate-100 ${
        size >= 60 ? "rounded-md" : "rounded-sm"
      }`}
      style={{
        width: size / 1.75,
        height: size / 1.75,
        marginTop: size / 1.66,
      }}
    >
      <div className="flex flex-col items-center">
        <span
          className={`${numberColor} font-black`}
          style={{
            fontSize: size * 0.4 + "px",
            lineHeight: 0,
            marginTop: size * 0.25 + "px",
          }}
        >
          {number}
        </span>
        <span
          className={`${numberColor} leading-none font-bold`}
          style={{
            fontSize: size * 0.18 + "px",
            lineHeight: 0,
            marginTop: size * 0.22 + "px",
          }}
        >
          {pips}
        </span>
      </div>
    </div>
  );
}

export function Tile({
  id,
  coordinate,
  type,
  resource,
  size = 50,
  absolute,
  boardCenter,
  draggable,
  droppable,
  number,
  hoveredTiles,
}) {
  const w = SQRT3 * size;
  const h = 2 * size;

  var style = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: w,
    height: h,
    backgroundImage: `url('${RESOURCE_SVGS[resource]}')`,
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",

    //opacity: resource === "Empty" ? 0.3 : 1,
    opacity:
      hoveredTiles && hoveredTiles.length > 0
        ? hoveredTiles.includes(parseInt(id))
          ? 1
          : 0.8
        : 1,
  };

  if (draggable) {
    Object.assign(style, {
      cursor: isDragging ? "move" : "grab",
      opacity: isDragging ? 0.5 : 1,
    });
  }
  const [centerX, centerY] = boardCenter;
  const [x, y] = tilePixelVector(coordinate, size, centerX, centerY);
  if (absolute) {
    Object.assign(style, {
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
    });
  }

  return (
    <>
      <CardAnim left={x} top={y - h / 2} size={size} />
      <div
        className="hex"
        ref={draggable ? drag : null}
        key={coordinate}
        style={style}
      >
        {number && <NumberToken size={size} number={number} pips={2} />}
      </div>
    </>
  );
}
