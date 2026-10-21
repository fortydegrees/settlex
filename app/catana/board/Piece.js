import React from "react";

export function Piece({
  coordinate,
  size = 50,
  svg,
  left,
  top,
  placing = false,
  highlight = false,
  buildingSVG,
  buildingSVGFallback
}) {
  const pieceSize = size;
  const pieceTop = top - pieceSize * 0.63;

  const className = [
    placing ? "animate-bounce" : "",
    highlight ? "piece-flash" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const backgroundImage =
    buildingSVGFallback && buildingSVGFallback !== buildingSVG
      ? `url('${buildingSVG}'), url('${buildingSVGFallback}')`
      : `url('${buildingSVG}')`;

  return (
    <div
      className={className}
      key={coordinate}
      style={{
        backgroundImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "absolute",
        pointerEvents: "none",
        backgroundRepeat: "no-repeat",
        width: pieceSize,
        height: pieceSize,
        left: left - pieceSize * 0.5,
        top: pieceTop,
        zIndex: placing? 2 : 1,
        opacity: 1,
      }}
    ></div>
  );
}
