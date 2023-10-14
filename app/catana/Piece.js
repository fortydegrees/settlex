import React, { useState } from "react";


export function Piece({ coordinate, size = 50, svg, left, top, placing=false, buildingSVG }) {


  return (
    <div
      className={placing ? "animate-bounce": ""}
      key={coordinate}
      style={{
        backgroundImage: `url('${buildingSVG}')`,
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
