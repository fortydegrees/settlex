import React, { useState, useRef } from "react";
import Image from "./components/NextImage";
import robberIcon from "../../public/svgs/icon_robber.svg";
import { SQRT3, tilePixelVector } from "./utils/coordinates";
import {
  STANDARD_RESOURCES,
  RESOURCE_SVGS,
  ResourceType,
} from "../board-editor/utils/types";
import { useDrag } from "react-dnd";
import "./Tile.css";
import { ActionNode } from "./ActionNode";

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
      <div className="select-none flex flex-col items-center cursor-default">
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
  isFlashing,
  isBlockedFlashing,
  hasRobber,
  canPlaceRobber,
  moves,
}) {
  const w = SQRT3 * size;
  const h = 2 * size;

  const [isHovered, setIsHovered] = useState(false);

  // Reset hover state when the ability to place a robber changes
  // This prevents stale "true" hover states from persisting when a tile becomes valid again later
  React.useEffect(() => {
    if (!canPlaceRobber) {
      setIsHovered(false);
    }
  }, [canPlaceRobber]);

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
    filter:
      (hasRobber || isHovered) && resource !== "Desert" && `saturate(0.85) brightness(0.85)`,
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
      <div
        className="hex"
        ref={draggable ? drag : null}
        //key={coordinate}
        style={style}
      >
        {/* {coordinate.join(', ')} */}
        {(isFlashing || isBlockedFlashing) && (
          <div
            style={{
              content: "",
              display: "block",
              position: "absolute",
              background: isBlockedFlashing
                ? "rgba(200, 50, 50, 0.5)"
                : "rgba(255, 255, 255, 0.5)",
              width: "60px",
              height: "100%",
              top: "0",
              left: "-50%",
              opacity: 1,
              filter: "blur(30px)",
              willChange: "transform",
              animation: "flash 1s 1",
            }}
          />
        )}
        {number && <NumberToken size={size} number={number} />}
        {hasRobber && (
          <Image
            src={robberIcon}
            alt="Robber"
            style={{
              position: 'absolute',
              transform: `translateX(-60%)`,
              animation: isBlockedFlashing ? 'robberPulse 0.5s ease-in-out 2' : 'none'
            }}
            width={size / 1.5}
            height={size / 1.5}
          />
        )}
        {canPlaceRobber && isHovered && (
           <div
             style={{ 
               position: 'absolute', 
               left: '50%',
               top: '50%',
               transform: 'translate(-50%, -50%)',
               width: size / 1.5,
               height: size / 1.5,
               pointerEvents: 'none', // Ensure clicks pass through to the action circle
               zIndex: 3 // Ensure it's above the tile but below/same level as action
             }}
           >
             <Image
               src={robberIcon}
               alt="Robber Ghost"
               className="animate-bounce"
               style={{ width: '100%', height: '100%' }} // Fill the wrapper
               width={size / 1.5}
               height={size / 1.5}
             />
           </div>
        )}
        {canPlaceRobber && (
          <div
            //add shadow when placing settlement
            className={`[background-image:radial-gradient(50%_50%_at_50%_50%,_rgba(255,255,255,0.7)_0%,_rgba(255,255,255,0)_100%)] animation-pulse`}
            //className={flashing ? "hover-opacity bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-300 to-transparent animation-pulse" : "hover-opacity"}

            style={{
              position: "absolute",
              cursor: "pointer",
              width: size/1.5,
              height: size/1.5,
              borderRadius: 100,
              borderColor: "#FFFFFF",
              borderWidth: 1.2,
              opacity: isHovered ? 0 : 0.8, // Hide the circle when hovering (since we show the ghost robber)
              //fillOpacity:0.2
              //opacity: hoveredNode ? (hoveredNode == nodeId ? 1 : 0.4) : 0.8,
              zIndex: 2,
              //opacity: (hoveredNode ? 1 : 0.5),
            }}
            onClick={()=>moves.moveRobber(id)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          ></div>
        )}
      </div>
    </>
  );
}

/*
flashing anim: https://codepen.io/h7w/pen/bGGOyyj
other flashes: https://codepen.io/emmawalden/pen/qBOZXGa https://codepen.io/paigen11/pen/VwKZGMp
*/
