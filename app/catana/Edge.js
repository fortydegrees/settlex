import React from "react";

import { tilePixelVector, getEdgeTransform } from "./utils/coordinates";
import useWindowSize from "./utils/useWindowSize";
import { ActionNode } from "./ActionNode";


const Road = ({id, color, size, tileX, tileY, transform}) => {
  return(
    <div
      id={id}
      className="opacity-animation"
      style={{
        //display: 'flex',
        transform: transform,
        backgroundImage: `url('/road_red.svg')`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        // filter: 'grayscale(1)',
        // transition: "filter 0.5s ease-in-out infinite",
        position: "absolute",
        //pointerEvents: "none",
        width: size,
        height: size * 0.2,
        left: tileX,
        top: tileY,
        //opacity: 0.7,
      }}
      
     />
  )
}


export function Edge({
  id,
  center,
  size,
  coordinate,
  direction,
  color,
  onClick,
  placing,
  actionNodeId,
  setHoveredNode,
  hoveredNode,
  moves
}) {
  const { width } = useWindowSize();
  const [centerX, centerY] = center;
  const [tileX, tileY] = tilePixelVector(coordinate, size, centerX, centerY);
  const transform = getEdgeTransform(direction, size, width);


  if (placing){
  return (<>
    {!hoveredNode && <Road id={id} size={size} tileX={tileX} tileY={tileY} transform={transform}

      
     />}
      
    <ActionNode
    key={id}
    nodeId={id}
   
    center={center}
    size={size}
    coordinate={coordinate}
    direction={direction}
    piece= {<Road id={id} size={size} tileX={tileX} tileY={tileY} transform={transform}/>}
    color={color}
    onClick={() => {
      moves.placeRoad(id);
      setHoveredNode(null)
    }}
    type="edge"
    setHoveredNode={setHoveredNode}
    hoveredNode={hoveredNode}
  /></>
  );
    }
    else{
      return (
        <div
          id={id}
          style={{
            display: 'flex',
            transform: transform,
            backgroundImage: `url('/road_red.svg')`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            position: "absolute",
            pointerEvents: "none",
            width: size,
            height: size * 0.2,
            left: tileX,
            top: tileY,
            opacity: 1,
          }}
          
        >
        </div>
      );
    }
}