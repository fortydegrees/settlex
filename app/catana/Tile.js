/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import { SQRT3, tilePixelVector } from "./utils/coordinates";
import { useDrag } from "react-dnd";
import "./Tile.css";
import {
  getClassicResourceIconPath,
  getBackgroundImageWithFallback,
  getClassicSvgPath,
  getResourceIconPath,
  getTileFile,
  getThemedSvgPath,
  handleThemeImageError,
} from "./theme/themes";

// Resource icons now use one shared transform across all resources.
// Baseline values come from the previous Sheep placement.
const TILE_ICON_TOP_FACTOR = 0.204;
const TILE_ICON_SCALE = 0.68;
const EMOJI_TILE_ICON_SCALE_MULTIPLIER = 0.85;
const EMOJI_TILE_ICON_TOP_MULTIPLIER = 1.16;
const ROBBER_SHADOW_LEFT_PERCENT = 62;
const ROBBER_SHADOW_TOP_PERCENT = 68;
const ROBBER_SHADOW_WIDTH_PERCENT = 82;
const ROBBER_SHADOW_HEIGHT_PERCENT = 30;
const ROBBER_SHADOW_ROTATION_DEG = -8;
const ROBBER_SHADOW_SKEW_DEG = -7;
const ROBBER_SHADOW_BLUR_PX = 4;
const ROBBER_SHADOW_OPACITY = 0.82;

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
  showOriginRobber = false,
  canPlaceRobber,
  showRobberHoverGhost = true,
  onRobberTargetHoverChange,
  onRobberTargetRegister,
  moves,
  themeId,
}) {
  const w = SQRT3 * size;
  const h = 2 * size;

  const [isHovered, setIsHovered] = useState(false);
  const robberTargetRef = React.useCallback(
    (node) => {
      onRobberTargetRegister?.({
        tileId: id,
        element: node ?? null
      });
    },
    [id, onRobberTargetRegister]
  );

  // Reset hover state when the ability to place a robber changes
  // This prevents stale "true" hover states from persisting when a tile becomes valid again later
  React.useEffect(() => {
    if (!canPlaceRobber) {
      setIsHovered(false);
      onRobberTargetHoverChange?.(null);
      onRobberTargetRegister?.({
        tileId: id,
        element: null
      });
    }
  }, [canPlaceRobber, id, onRobberTargetHoverChange, onRobberTargetRegister]);

  const robberSrc = getThemedSvgPath(themeId, "icon_robber.svg");
  const robberFallbackSrc = getClassicSvgPath("icon_robber.svg");
  const tileResourceIconSrc = getResourceIconPath(themeId, resource);
  const tileResourceIconFallbackSrc = getClassicResourceIconPath(resource);
  const tileIconScale =
    themeId === "emoji"
      ? TILE_ICON_SCALE * EMOJI_TILE_ICON_SCALE_MULTIPLIER
      : TILE_ICON_SCALE;
  const tileIconTop =
    themeId === "emoji"
      ? size * TILE_ICON_TOP_FACTOR * EMOJI_TILE_ICON_TOP_MULTIPLIER
      : size * TILE_ICON_TOP_FACTOR;
  var style = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: w,
    height: h,
    backgroundImage: getBackgroundImageWithFallback(themeId, getTileFile(resource)),
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
        {tileResourceIconSrc && (
          <img
            src={tileResourceIconSrc}
            alt=""
            style={{
              position: "absolute",
              left: "50%",
              top: tileIconTop,
              transform: "translateX(-50%)",
              width: size * tileIconScale,
              height: size * tileIconScale,
              pointerEvents: "none",
            }}
            draggable={false}
            onError={(event) =>
              handleThemeImageError(event, tileResourceIconFallbackSrc)
            }
          />
        )}
        {number && <NumberToken size={size} number={number} />}
        {hasRobber && (
          <div
            style={{
              position: "absolute",
              width: size / 1.5,
              height: size / 1.5,
              transform: "translateX(-60%)",
              pointerEvents: "none",
              zIndex: 1
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: `${ROBBER_SHADOW_LEFT_PERCENT}%`,
                top: `${ROBBER_SHADOW_TOP_PERCENT}%`,
                width: `${ROBBER_SHADOW_WIDTH_PERCENT}%`,
                height: `${ROBBER_SHADOW_HEIGHT_PERCENT}%`,
                borderRadius: 999,
                transform: `translate(-50%, 0) rotate(${ROBBER_SHADOW_ROTATION_DEG}deg) skewX(${ROBBER_SHADOW_SKEW_DEG}deg)`,
                transformOrigin: "50% 50%",
                background:
                  "radial-gradient(ellipse at 42% 50%, rgba(15, 23, 42, 0.46) 0%, rgba(15, 23, 42, 0.24) 44%, rgba(15, 23, 42, 0.1) 70%, rgba(15, 23, 42, 0) 100%)",
                filter: `blur(${ROBBER_SHADOW_BLUR_PX}px)`,
                opacity: showOriginRobber
                  ? ROBBER_SHADOW_OPACITY * 0.45
                  : ROBBER_SHADOW_OPACITY
              }}
            />
            <img
              src={robberSrc}
              alt="Robber"
              style={{
                position: "absolute",
                inset: 0,
                opacity: showOriginRobber ? 0.4 : 1,
                animation: isBlockedFlashing
                  ? "robberPulse 0.5s ease-in-out 2"
                  : "none",
                width: "100%",
                height: "100%"
              }}
              draggable={false}
              onError={(event) =>
                handleThemeImageError(event, robberFallbackSrc)
              }
            />
          </div>
        )}
        {canPlaceRobber && showRobberHoverGhost && isHovered && (
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
             <img
               src={robberSrc}
               alt="Robber Ghost"
               className="animate-bounce"
               style={{ width: '100%', height: '100%' }} // Fill the wrapper
               draggable={false}
               onError={(event) =>
                 handleThemeImageError(event, robberFallbackSrc)
               }
             />
           </div>
        )}
        {canPlaceRobber && (
          <div
            ref={robberTargetRef}
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
              opacity:
                showRobberHoverGhost && isHovered ? 0 : 0.8,
              //fillOpacity:0.2
              //opacity: hoveredNode ? (hoveredNode == nodeId ? 1 : 0.4) : 0.8,
              zIndex: 2,
              //opacity: (hoveredNode ? 1 : 0.5),
            }}
            onClick={()=>moves.moveRobber(id)}
            onMouseEnter={(event) => {
              setIsHovered(true);
              onRobberTargetHoverChange?.({
                tileId: id,
                element: event.currentTarget
              });
            }}
            onMouseLeave={() => {
              setIsHovered(false);
              onRobberTargetHoverChange?.(null);
            }}
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
