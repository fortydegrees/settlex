import React, { useState } from "react";

import { SQRT3, tilePixelVector } from "./utils/coordinates";
import { STANDARD_RESOURCES, RESOURCE_SVGS, ResourceType } from "./utils/types";
import { useDrag } from "react-dnd";
import "./page.css";

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

export function NumberToken({ number, style, size }) {
  const pips = numberToPips(number);
  let numberColor = "text-black";
  if (number == 6 || number == 8) {
    numberColor = "text-red-600";
  }
  return (
    <div
      className={`drop-shadow-md bg-slate-100 ${
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

export function EditableTile({
  coordinate,
  type,
  resource,
  size = 50,
  absolute,
  boardCenter,
  draggable,
  droppable,
  number,
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: resource,
    item: { resource },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const w = SQRT3 * size;
  const h = 2 * size;

  var style = {
    display: "flex",
    "justify-content": "center",
    "align-items": "center",
    width: w,
    height: h,
    backgroundImage: `url('${RESOURCE_SVGS[resource]}')`,
    backgroundSize: "contain",
    opacity: resource === "Empty" ? 0.3 : 1,
  };

  if (draggable) {
    Object.assign(style, {
      cursor: isDragging ? "move" : "grab",
      opacity: isDragging ? 0.5 : 1,
    });
  }

  if (absolute) {
    const [centerX, centerY] = boardCenter;
    const [x, y] = tilePixelVector(coordinate, size, centerX, centerY);
    Object.assign(style, {
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
    });
  }

  return (
    <div
      className="hex"
      ref={draggable ? drag : null}
      key={coordinate}
      style={style}
    >
      <NumberToken size={size} number={number} />
    </div>
  );
}
