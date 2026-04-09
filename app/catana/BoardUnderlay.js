import React from "react";
import { getBoardUnderlayPath } from "./theme/themes";
import {
  BOARD_UNDERLAY_DESIGN_SIZE,
  BOARD_UNDERLAY_VIEWBOX,
} from "./utils/boardUnderlayGeometry";
import { getBoardUnderlayFrame } from "./utils/boardUnderlayLayout";

export function BoardUnderlay({ center, size, themeId }) {
  const frame = getBoardUnderlayFrame({
    center,
    size,
    viewBox: BOARD_UNDERLAY_VIEWBOX,
    designSize: BOARD_UNDERLAY_DESIGN_SIZE,
  });

  return React.createElement("img", {
    src: getBoardUnderlayPath(themeId),
    alt: "",
    "aria-hidden": true,
    "data-testid": "board-underlay",
    draggable: false,
    loading: "eager",
    fetchpriority: "high",
    style: {
      position: "absolute",
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      pointerEvents: "none",
      userSelect: "none",
      opacity: 1,
    },
  });
}
