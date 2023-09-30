import React, { useState, useEffect } from "react";
import useWindowSize from "./utils/useWindowSize";
import { SQRT3 } from "./utils/coordinates";
import { Tile } from "./Tile";
import { Building } from "./Building";
import {Node } from "./Node"
import {ActionNode} from "./ActionNode"
import { Edge } from "./Edge";
import "./Board.css";
import { motion, useAnimation } from "framer-motion";
import { BoardContext } from './hooks/useBoardContext';


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

//this is our board that simply renders the gameState
/*
render all tiles
render nodes (buildings)
render edges (roads)
buildActions
    place robber
    place road
    place settlement
    upgrade settlement
robber (and merchant etc)
*/
export function CatanBoard({ isMobile, ctx, G, moves, isActive }) {

  const [hoveredNode, setHoveredNode] = useState(null)
  const [hoveredTiles, setHoveredTiles] = useState([])


  useEffect(()=>{
    if (hoveredNode){
      const newHoveredTiles = []
      for (const tile of G.tiles){
        if (Object.values(tile.tile.nodes).includes(parseInt(hoveredNode))){
          newHoveredTiles.push(tile.tile.id)
        }
      }
      setHoveredTiles(newHoveredTiles)
    }
    else{
      setHoveredTiles([])
    }
  },[hoveredNode])

  const { width, height } = useWindowSize();
  // TODO: Keep in sync with CSS
  const containerHeight = height - 144 - 38 - 40;
  const containerWidth = isMobile ? width - 280 : width;
  const center = [containerWidth / 2, containerHeight / 2];
  const size = computeDefaultSize(containerWidth, containerHeight);
  if (!size) {
    return null;
  }


  //get all tiles
  const tiles = G.tiles.map(({ coordinate, tile }) => (
    <Tile
      // key={coordinate}
      // center={center}
      // coordinate={coordinate}
      // tile={tile}
      // size={size}
      key={tile.id}
      id={tile.id}
      absolute
      coordinate={coordinate}
      size={size}
      type={tile.type}
      resource={tile.resource}
      number={tile.number}
      boardCenter={center}
      hoveredTiles={hoveredTiles}
      
    />
  ));


  
  const buildings = Object.keys(G.nodes).map((node) => {
    const { color, buildingType, direction, tile_coordinate} = G.nodes[node];
    //don't render if no building or not isActive/canPlaceSettlement

    //if isActive && canPlaceSettlement
    // show nodes where one can place (e.g. nodes where there is no building & +2 away)
    if (buildingType){
    return (
      <Building
        key={node}
        center={center}
        size={size}
        coordinate={tile_coordinate}
        direction={direction}
        building={buildingType}
        color={color}
        //flashing={!replayMode && id in nodeActions}
        //flashing={isActive}
        //onClick={buildOnNodeClick(id, nodeActions[id])}
      />
    );
    }
  })

  //TODO: i think we need to just render nodes.
  //as in, right now we render all nodes and just hide it if it's not actionable
  //we only need to do this if it's the player's turn
  const actions = []
  {isActive && G.valids.nodes.map((node) => {
    const { direction, tile_coordinate, id , tileId} = node;
    //TODO: get the action type here.
    //E.g. place settlement, placeCity
    actions.push(
      <ActionNode
        key={id}
        nodeId={id}
        tileId={tileId} //tileId
        center={center}
        size={size}
        coordinate={tile_coordinate}
        direction={direction}
        building="Settlement"
        //color={color}
        //flashing={!replayMode && id in nodeActions}
        flashing={isActive}
        //onClick={buildOnNodeClick(id, nodeActions[id])}
        onClick={() => {
          moves.placeSettlement(id);
        }}
        setHoveredNode={setHoveredNode}
        hoveredNode={hoveredNode}
      />
    );
  });}

  G.valids.edges.map((edge) => {
    const { color, direction, tile_coordinate, id} = edge;
    //don't render if no building or not isActive/canPlaceSettlement

    //if isActive && canPlaceSettlement
    // show nodes where one can place (e.g. nodes where there is no building & +2 away)
    actions.push(
      <Edge
        id={id}
        key={id}
        center={center}
        size={size}
        coordinate={tile_coordinate}
        direction={direction}
        color={color}
        flashing="true"
        onClick={() => {
          moves.placeRoad(id);
        }}
        
      />
    );
  });
  const edges = Object.keys(G.edges).map((edge)=>{
    const { color, direction, tile_coordinate} = G.edges[edge];
  
   return(
      <Edge
        id={edge}
        key={edge}
        center={center}
        size={size}
        coordinate={tile_coordinate}
        direction={direction}
        color={color}
        //flashing={id in edgeActions}
        //onClick={buildOnEdgeClick(id, edgeActions[id])}
      />
    )
   })




//make a subgraph of buildable nodes - used in catanatron
//https://github.com/bcollazo/catanatron/blob/425ccdef04921d1756a1c9bb1f904fceb1f3c3d3/catanatron_core/catanatron/models/board.py#L148
//but we don't do this as we don't generate water tiles.. yet..
//const buildable_subgraph = STATIC_GRAPH.subgraph(landNodes)

  return (

            <div className="h-screen w-screen" >
              {tiles}

              

              {edges} 

              {buildings}
              {actions}
              {/* <Robber
          center={center}
          size={size}
          coordinate={G.robber_coordinate}
        />  */}
            </div>
  );
}
