import React, { useState } from "react";

import { SQRT3, tilePixelVector } from "./utils/coordinates";
import { STANDARD_RESOURCES, RESOURCE_SVGS, ResourceType } from "./utils/types";
import { useDrag } from "react-dnd";
import "./page.css"
// export function NumberToken({ className, children, style, size }) {
//   return (
//     <div
//       className="shadow-md"
//       style={{
//         "--base-size": `${size}px`, // this var can be overrided via `style` prop
//         ...style,
//       }}

//     onClick={()=>getBuildableNodes('red')}
//     >
//       {children}
//     </div>
//   );
// }

// const numberToPips = (number) => {
//   switch (number) {
//     case 2:
//     case 12:
//       return "•";
//     case 3:
//     case 11:
//       return "••";
//     case 4:
//     case 10:
//       return "•••";
//     case 5:
//     case 9:
//       return "••••";
//     case 6:
//     case 8:
//       return "•••••";
//     default:
//       return "";
//   }
// };

export function Piece({
  coordinate,
  type,
  resource,
  size = 50,
  absolute,
  boardCenter,
  draggable,
  droppable,
  svg
}) {

//   const [{ isDragging}, drag] = useDrag(() => ({
 
//     type: resource,
//     item: {resource},
//     collect: (monitor) => ({
//       isDragging: !!monitor.isDragging(),
      
//     }),
//   }));

  const w = size;
  const h = size;

  var style = {
    width: w,
    height: h,
    backgroundImage: `url('${svg}')`,
    backgroundSize: "contain",
    opacity: resource === "Empty" ? 0.3 : 1,
  };

  if (draggable){
    Object.assign(style,{
        cursor: isDragging ? "move" : "grab",
        opacity: isDragging ? 0.5 : 1,
    })
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

  return <div ref={draggable? drag : null} key={coordinate} style={style}></div>;
}
