import React, { useState } from "react";
import useWindowSize from "./utils/useWindowSize";
import { Tile } from "./Tile";
import {EditableTile} from "./EditableTile"
import { EmptyTile } from "./EmptyTile";
import { SQRT3, tilePixelVector } from "./utils/coordinates";
import { generateBoard } from "./utils/boardGenerator";


function computeDefaultSize(divWidth, divHeight) {
    //TODO: dynamically get this based on generated board size
  const numLevels = 7; // 3 rings + 1/2 a tile for the outer water ring
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

const initialBoard = generateBoard();

//TODO: board props
//editable - e.g. if can drag/drop tiles etc
    //e.g. if editable, render different tiles (EditableTile?)
//initialState - board string. e.g. for ranked/normal game, will come from spec/generatedBoard()
    //can also come from providing function
export function Board({editable}) {
    const [board, setBoard] = useState(initialBoard)

    const updateTileResource = (tileId, newResource) => {
        setBoard((prevBoard) =>
          prevBoard.map((tile) =>
            tile.id === tileId ? { ...tile, resource: newResource } : tile
          )
        );
      };

      //TODO: this needs to be in sync with the zoom/pan stuff.
      //    actually not sure. originally thought numberTiles didn't update, but they do..
  const { width, height } = useWindowSize();
  // TODO: Keep in sync with CSS
  const containerHeight = height - 144 - 38 - 40;
  //const containerWidth = isMobile ? width - 280 : width;
  const containerWidth = width;
  const center = [containerWidth / 2, containerHeight / 2];
  const size = computeDefaultSize(containerWidth, containerHeight);
  if (!size) {
    return null;
  }

  console.log(board)
  //get all tiles
  const tiles = board.map(({ id, coordinate, type, resource, number }) => {
    if (resource === "Empty"){
        return(
        <EmptyTile key={id}
        id={id}
        absolute
        coordinate={coordinate}
        size={size}
        type={type}
        resource={resource}
        boardCenter={center}
        updateTileResource={updateTileResource}/>
        )
    }
    else{
        if (editable){
            return <EditableTile  key={id}
            absolute
            coordinate={coordinate}
            size={size}
            type={type}
            resource={resource}
            number={number}
            boardCenter={center}
            draggable={false} />
        }
        else{
            return (
                <Tile
                  key={id}
                  absolute
                  coordinate={coordinate}
                  size={size}
                  type={type}
                  resource={resource}
                  number={6}
                  boardCenter={center}
                  
                  
                />
              );
        }

    }
  });

  return (
    //tiles
    <div style={{ width: containerWidth, height: height }}>{tiles}</div>
  );
}
