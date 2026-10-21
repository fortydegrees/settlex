import React, { useState } from "react";

import { SQRT3, tilePixelVector } from "./utils/coordinates";
import { STANDARD_RESOURCES, RESOURCE_SVGS, ResourceType } from "./utils/types";
import { useDrag, useDrop } from "react-dnd";

const res = ["Wood", "Wheat", "Brick", "Sheep", "Ore"]

export function EmptyTile({
  coordinate,
  type,
  id,
  resource,
  size = 50,
  absolute,
  boardCenter,
  updateTileResource
}) {

  const [{isOver}, drop] = useDrop(
    () => ({
      accept: Object.values(ResourceType),
      drop: (item) => {
        console.log(item)
        updateTileResource(id, item.resource)
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver()
      })
    }),
    []
  )
  const w = SQRT3 * size;
  const h = 2 * size;

  var style = {
    width: w,
    height: h,
    backgroundImage: `url('${RESOURCE_SVGS[resource]}')`,
    backgroundSize: "contain",
    opacity: isOver ? 1 : 0.3,
  };


  if (absolute) {
    const [centerX, centerY] = boardCenter;
    const [x, y] = tilePixelVector(coordinate, size, centerX, centerY);
    Object.assign(style, {
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
    });
  }

  return <div ref={drop} key={coordinate} style={style} 
  //onClick={()=>updateTileResource(id,res[Math.floor(Math.random()*res.length)] )}
  ></div>;
}
