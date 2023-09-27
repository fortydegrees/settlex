import React from "react";

import "./Tile.css";

import { SQRT3, tilePixelVector } from "./utils/coordinates";
import { motion } from "framer-motion"
import { buildSettlement } from "./utils/game";
import { getBuildableNodes } from "./utils/boardUtils";
export function NumberToken({ className, children, style, size }) {
  return (
    <div
      className="shadow-md"
      style={{
        "--base-size": `${size}px`, // this var can be overrided via `style` prop
        ...style,
      }}
      
    onClick={()=>getBuildableNodes('red')}
    >
      {children}
    </div>
  );
}

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

export function Tile({ center, coordinate, tile, size }) {
  const w = SQRT3 * size;
  const h = 2 * size;
  const [centerX, centerY] = center;
  const [x, y] = tilePixelVector(coordinate, size, centerX, centerY);

  let contents;
  let resourceTile;
  //check it's a resource tile
  if (tile.number) {
    contents = (
      <NumberToken size={size}>
        <div>{tile.number}</div>
        <div className="pips">{numberToPips(tile.number)}</div>
      </NumberToken>
    );
    resourceTile = {
      Brick: '#E53935',
      Sheep: '#BCFF6B',
      Ore: '#CFD8DC',
      Wood: '#3A7822',
      Wheat: '#FFF176',
    }[tile.resource];
  } else if (tile.type === "DESERT") {
    resourceTile = '#8F6455';
  } else if (tile.type === "PORT") {
    let x = 0;
    let y = 0;
    if (tile.direction.includes("SOUTH")) {
      y += size / 3;
    }
    if (tile.direction.includes("NORTH")) {
      y -= size / 3;
    }
    if (tile.direction.includes("WEST")) {
      x -= size / 4;
      if (tile.direction === "WEST") {
        x = -size / 3;
      }
    }
    if (tile.direction.includes("EAST")) {
      x += size / 4;
      if (tile.direction === "EAST") {
        x = size / 3;
      }
    }
    if (tile.resource === null) {
      contents = (
        <div
          className="port"
          style={{
            left: x,
            top: y,
          }}
        >
          3:1
        </div>
      );
    } else {
      const portBackground = {
        BRICK: '#E53935',
        SHEEP: '#BCFF6B',
        ORE: '#CFD8DC',
        WOOD: '#3A7822',
        WHEAT: '#FFF176',
      }[tile.resource];
      contents = (
        <div
          class="port"
          style={{
            left: x,
            top: y,
            backgroundColor: portBackground,
            height: 60,
            backgroundSize: "contain",
            width: 52,
            backgroundRepeat: "no-repeat",
          }}
        >
          2:1
        </div>
      );
    }
  }

  return (
    <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    className="tile"
      key={coordinate}
      style={{
        
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        backgroundColor: resourceTile
      }}
    >
      {contents}
      </motion.div>
  );
}
