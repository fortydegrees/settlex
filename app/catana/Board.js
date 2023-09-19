import React, { useState } from "react";
import useWindowSize from "./utils/useWindowSize";
import { SQRT3 } from "./utils/coordinates";
import { Tile } from "./Tile";
import { Node } from "./Node";
import {Edge } from "./Edge"
import "./Board.css";
import { motion, useAnimation } from "framer-motion";

function computeDefaultSize(divWidth, divHeight) {
  const numLevels = 6; // 3 rings + 1/2 a tile for the outer water ring
  // divHeight = numLevels * (3h/4) + (h/4), implies:
  const maxSizeThatRespectsHeight = (4 * divHeight) / (3 * numLevels + 1) / 2;
  const correspondingWidth = SQRT3 * maxSizeThatRespectsHeight;
  let size;
  if (numLevels * correspondingWidth < divWidth) {
    // thus complete board would fit if we pick size based on height (height is limiting factor)
    size = maxSizeThatRespectsHeight;
  } else {
    // we'll have to decide size based on width.
    const maxSizeThatRespectsWidth = divWidth / numLevels / SQRT3;
    size = maxSizeThatRespectsWidth;
  }
  return size;
}

export function CatanBoard({
  isMobile,
  ctx,
  G,
  moves,
  isActive
}) {
  console.log(ctx, moves)

  // const currentPlayerId = ctx.currentPlayer;

  // const isActive = G.players.map((P) => {
  //   return (!currentPlayerId && !P.isReady) || P.id === currentPlayerId;
  // });

  // console.log(G.players)
  // console.log(currentPlayerId)
  // console.log(ctx.currentPlayer,ctx.activePlayer)
    //zoom
  const [scale, setScale] = useState(1);
  const controls = useAnimation();

  const handleScroll = (event) => {
    const delta = event.deltaY;

    // Define the scale change factor
    const scaleFactor = 0.02;

    // Calculate the new scale
    const newScale = scale + delta * scaleFactor;

    // Limit the scale to a reasonable range (adjust as needed)
    const minScale = 0.5;
    const maxScale = 2;

    if (newScale >= minScale && newScale <= maxScale) {
      setScale(newScale);

      // Animate the scale change smoothly using Framer Motion
      controls.start({ scale: newScale });
    }
    event.preventDefault();
  };


  const { width, height } = useWindowSize();
  // TODO: Keep in sync with CSS
  const containerHeight = height - 144 - 38 - 40;
  const containerWidth = isMobile ? width - 280 : width;
  const center = [containerWidth / 2, containerHeight / 2];
  const size = computeDefaultSize(containerWidth, containerHeight);
  if (!size) {
    return null;
  }


  const tiles = G.tiles.map(({ coordinate, tile }) => (
    <Tile
      key={coordinate}
      center={center}
      coordinate={coordinate}
      tile={tile}
      size={size}
    />
  ));
  const buildings = Object.keys(G.nodes).map((node)=>{
    const { color, building, direction, tile_coordinate, id } = G.nodes[node]
      //don't render if no building or not isActive/canPlaceSettlement

     //if isActive && canPlaceSettlement
     // show nodes where one can place (e.g. nodes where there is no building & +2 away)
        return(
      <Node
        key={node}
        nodeId={node}
        tileId={id} //tileId
        center={center}
        size={size}
        coordinate={tile_coordinate}
        direction={direction}
        building={building}
        color={color}
        //flashing={!replayMode && id in nodeActions}
        //flashing={isActive}
        //onClick={buildOnNodeClick(id, nodeActions[id])}
      />)
        
  })
  const nodes = Object.keys(G.valids.nodes).map(
    (node) => {
      const { direction, tile_coordinate, id } = G.nodes[node]
      //don't render if no building or not isActive/canPlaceSettlement

     //if isActive && canPlaceSettlement
     // show nodes where one can place (e.g. nodes where there is no building & +2 away)
        return(
      <Node
        key={node}
        nodeId={node}
        tileId={id} //tileId
        center={center}
        size={size}
        coordinate={tile_coordinate}
        direction={direction}
        //building={building}
        //color={color}
        //flashing={!replayMode && id in nodeActions}
        flashing={isActive}
        //onClick={buildOnNodeClick(id, nodeActions[id])}
        onClick={()=>{console.log(moves)
          moves.placeSettlement(node)}}
      />)
        }
  );
  const edges = Object.values(G.edges).map(
    ({ color, direction, tile_coordinate, id }) => (
      <Edge
        id={id}
        key={id}
        center={center}
        size={size}
        coordinate={tile_coordinate}
        direction={direction}
        color={color}
        //flashing={id in edgeActions}
        //onClick={buildOnEdgeClick(id, edgeActions[id])}
      />
    )
  );
  return (
    //inertia: https://github.com/pmndrs/use-gesture/issues/132
    <><motion.div drag class="board-container">
      <div onWheel={handleScroll}>
        <motion.div
          // style={{
          //   width: '100%',
          //   height: '100%',
          // }}
          initial={{ scale: 1 }} // Initial scale
          animate={controls} // Animate the scale change
        >
          <div class="board">
            {tiles}
            
            {buildings}
            {nodes}
            {/* {edges} */}
        {/* <Robber
          center={center}
          size={size}
          coordinate={G.robber_coordinate}
        />  */}
          </div>
        </motion.div>
      </div>
    </motion.div><div>PHASE</div></>
  );
}
