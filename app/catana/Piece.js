import React, { useState } from "react";

import { SQRT3, tilePixelVector } from "./utils/coordinates";
import { useDrag } from "react-dnd";
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

export function Piece({ coordinate, size = 50, svg, left, top, placing=false }) {
  //   if (absolute) {
  //     const [centerX, centerY] = boardCenter;
  //     const [x, y] = tilePixelVector(coordinate, size, centerX, centerY);
  //     Object.assign(style, {
  //       position: "absolute",
  //       left: x - w / 2,
  //       top: y - h / 2,

  //     });
  //   }

  return (
    <div
      className={placing && "animate-bounce"}
      key={coordinate}
      style={{
        backgroundImage: `url('${svg}')`,
        backgroundSize: "cover",
        position: "absolute",
        pointerEvents: "none",
        backgroundRepeat: "no-repeat",
        width: size,
        height: size,
        left: left - size * 0.5,
        top: top - size * 0.63,
        zIndex: placing? 2 : 1,
        opacity: 1,
      }}
    ></div>
  );
}
