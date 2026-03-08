import React from "react";
import { isRasterAssetPath } from "./theme/themes";

const RASTER_SETTLEMENT_SCALE = 0.88;
const RASTER_SETTLEMENT_Y_LIFT_PX = 5;

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
  const usesRasterAsset = isRasterAssetPath(buildingSVG);
  const isRasterSettlement =
    usesRasterAsset && /settlement_/i.test(String(buildingSVG ?? ""));
  const pieceRenderScale = isRasterSettlement ? RASTER_SETTLEMENT_SCALE : 1;
  const pieceSize = size * pieceRenderScale;
  const pieceTop =
    top -
    pieceSize * (usesRasterAsset ? 0.59 : 0.63) -
    (isRasterSettlement ? RASTER_SETTLEMENT_Y_LIFT_PX : 0);

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
        backgroundSize: usesRasterAsset ? "contain" : "cover",
        backgroundPosition: usesRasterAsset ? "center bottom" : "center",
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
