import React, { useState, useEffect, useRef, useMemo } from "react";

import { Tile } from "./Tile";
import { Building } from "./Building";
import { Node } from "./Node";
import { ActionNode } from "./ActionNode";
import { Edge } from "./Edge";
import { Port} from "./Port";
import {Card} from "./Card"
import "./Board.css";
import { SQRT3, tilePixelVector } from "./utils/coordinates";
import useWindowSize from "./utils/useWindowSize";
import { useLatestPropsOnEffect, useEffectListener } from "bgio-effects/react";
  import { useTransition, animated } from "@react-spring/web";
  import { TileTypes } from "./game/types";
let id = 0; //for key id of card aniimations

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
  //we do this so that the board updates while the cardContainer is waiting to be updated after animation
  G = useLatestPropsOnEffect("distributeCardsFromTile").G;
  ctx = useLatestPropsOnEffect("distributeCardsFromTile").ctx;

  //from https://github.com/blunket/camelot/blob/master/src/Board.jsx
  // let isMyTurn = this.props.playerID === this.props.ctx.currentPlayer;
  // let amISpectating = this.props.playerID !== "0" && this.props.playerID !== "1";

  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState([]);
  const [flashingTiles, setFlashingTiles] = useState([])


  const ref = useRef(null); //ref for card anims
  const divRef = useRef(null); //ref for whole page (to get x/y for card holders)
  const { width, height } = useWindowSize();
  // TODO: Keep in sync with CSS
  const containerHeight = height - 144 - 38 - 40;
  //const containerWidth = isMobile ? width - 280 : width;
  const containerWidth = width;
  const center = [containerWidth / 2, containerHeight / 2];
  const size = computeDefaultSize(containerWidth, containerHeight);

 
  useEffectListener(
    "distributeCardsFromTile",
    (cards) => {
      //flash tiles
      setFlashingTiles(cards.map((c)=>c.tile.tile.id))
      //wait one second (for tiles to flash) then distribute cards
      setTimeout(() => {
        for (const card of cards) {
          const { tile, playerID } = card;

          const [centerX, centerY] = center;
          const [x, y] = tilePixelVector(
            tile.coordinate,
            size,
            centerX,
            centerY
          );

          const cardWidth = size * 0.5; //TODO: where to properly define/reference this?

          const startX = (x - cardWidth / 2) + (Math.floor(Math.random() * 5) - 2);
          const startY = (y - size) + (Math.floor(Math.random() * 10) - 4);


          const cardResource = tile.tile.resource;

          const divRect = divRef.current.getBoundingClientRect();
          const element = document.getElementById(
            `p${playerID}-${cardResource}`
          );

          const rect = element.getBoundingClientRect();

          const xRelativeToDiv = rect.left - divRect.left;
          const yRelativeToDiv = rect.top - divRect.top;

          const finalX = xRelativeToDiv - startX;
          const finalY = yRelativeToDiv - startY - 15;
          ref.current?.({ startX, startY, finalX, finalY, cardResource });
          setFlashingTiles([])
        }
      }, 1000);
    },
    [width, height, size]
  );


  useEffect(() => {
    if (Object.entries(ctx.activePlayers).flat().includes("settlement")) {
      if (hoveredNode) {
        const newHoveredTiles = [];
        for (const tile of G.tiles) {
          if (Object.values(tile.tile.nodes).includes(parseInt(hoveredNode))) {
            newHoveredTiles.push(tile.tile.id);
          }
        }
        setHoveredTiles(newHoveredTiles);
      } else {
        setHoveredTiles([]);
      }
    }
  }, [hoveredNode]);

  if (!size) {
    return null;
  }

  //get all tiles
  const tiles = G.tiles.map(({ coordinate, type, tile }) => {
    if (type == TileTypes.RESOURCE){
      return(
        <Tile
        key={tile.id}
        id={tile.id}
        absolute
        coordinate={coordinate}
        size={size}
        resource={tile.resource}
        number={tile.number}
        boardCenter={center}
        hoveredTiles={hoveredTiles}
        isFlashing={flashingTiles.includes(tile.id)}
      />
      )
    }
    else if (type == TileTypes.PORT){
      return(
        <Port key={tile.id} boardCenter={center}  size={size} coordinate={coordinate} tile={tile} />
      )
    }
  })

  

  const buildings = [];
  Object.keys(G.nodes).map((node) => {
    const { building, direction, tile_coordinate, id, tileId } =
      G.nodes[node];
    //don't render if no building or not isActive/canPlaceSettlement

    //if isActive && canPlaceSettlement
    // show nodes where one can place (e.g. nodes where there is no building & +2 away)
    //TODO: maybe don't render node if buildingType is null?
    if (building) {


      buildings.push(
        <Node
          key={id}
          nodeId={id}
          tileId={tileId} //tileId
          center={center}
          size={size}
          coordinate={tile_coordinate}
          direction={direction}
          buildingType={building.type}
          buildingColor={G.players[building.owner].color}
        />
        // <Building
        //   key={node}
        //   center={center}
        //   size={size}
        //   coordinate={tile_coordinate}
        //   direction={direction}
        //   building={buildingType}
        //   color={color}
        //   //flashing={!replayMode && id in nodeActions}
        //   //flashing={isActive}
        //   //onClick={buildOnNodeClick(id, nodeActions[id])}
        // />
        //   <Piece
        //   svg="https://colonist.io/dist/images/settlement_red.svg?v168"
        //   size={40}
        //   left={x}
        //   top={y}
        // />
      );
    }
  });

  Object.keys(G.edges).map((edge) => {
    const { color, direction, tile_coordinate } = G.edges[edge];
    if (color) {
      buildings.push(
        <Edge
          key={edge}
          id={edge}
          center={center}
          size={size}
          coordinate={tile_coordinate}
          direction={direction}
          color={color}
        />
      );
    }
  });

  //TODO: i think we need to just render nodes.
  //as in, right now we render all nodes and just hide it if it's not actionable
  //we only need to do this if it's the player's turn
  const actions = [];
  {
    isActive &&
      G.valids.nodes.map((node) => {
        const { direction, tile_coordinate, id, tileId } = node;
        //TODO: get the action type here.
        //E.g. place settlement, placeCity
        actions.push(
          <ActionNode
            key={id}
            nodeId={id}
            center={center}
            size={size}
            coordinate={tile_coordinate}
            direction={direction}
            player={Object.keys(ctx.activePlayers)[0]}
            buildingType={ctx.activePlayers[ctx.currentPlayer]}
            buildingColor={G.players[ctx.currentPlayer].color}
            flashing={isActive}
            onClick={() => {
             
              moves.placeSettlement(id);
              setHoveredNode(null);
              setHoveredTiles([]);
            }}
            setHoveredNode={setHoveredNode}
            hoveredNode={hoveredNode}
          />
        );
      });
  }

  //editable edges e.g placing road
  {
    isActive &&
      G.valids.edges.map((edge, x) => {
        const { color, direction, tile_coordinate, id } = edge;
        //don't render if no building or not isActive/canPlaceSettlement
        //if isActive && canPlaceSettlement
        // show nodes where one can place (e.g. nodes where there is no building & +2 away)
        actions.push(
          <Edge
            id={id}
            actionNodeId={x}
            key={id}
            center={center}
            size={size}
            coordinate={tile_coordinate}
            direction={direction}
            color={color}
            placing="true"
            player={Object.keys(ctx.activePlayers)[0]}
            buildingType={ctx.activePlayers[ctx.currentPlayer]}
            buildingColor={G.players[ctx.currentPlayer].color}
            moves={moves}
            setHoveredNode={setHoveredNode}
            hoveredNode={hoveredNode}
          />
        );
      });
  }

  //make a subgraph of buildable nodes - used in catanatron
  //https://github.com/bcollazo/catanatron/blob/425ccdef04921d1756a1c9bb1f904fceb1f3c3d3/catanatron_core/catanatron/models/board.py#L148
  //but we don't do this as we don't generate water tiles.. yet..
  //const buildable_subgraph = STATIC_GRAPH.subgraph(landNodes)

  return (
    <div ref={divRef}>
      {" "}
      <CardAnimContainer
        //style={{ position: "absolute" }}
        children={(add) => {
          ref.current = add;
        }}
        size={size}
      />
      <div className="h-screen w-screen">
        {tiles}

        {buildings}
        {actions}

        {/* <Robber
          center={center}
          size={size}
          coordinate={G.robber_coordinate}
        />  */}
      </div>
    </div>
  );
}

function CardAnimContainer({
  config = { mass: 0.5, friction: 20 },
  timeout = 5000,
  children,
  size,
}) {
  const width = size * 0.5;
  const height = size * 0.7;

  const refMap = useMemo(() => new WeakMap(), []);
  const [items, setItems] = useState([]);

  const transitions = useTransition(items, {
    //starting condition, e.g. 0 opacity, 0 scale factor, left/top provided
    //TODO: we don't want to be providing left/top here as it's bad for performance.
    from: (item) => {
      return {
        opacity: 0,
        z: 0,
        x: 0,
        y: 0,
        //left: item.startX,
        //top: item.startY,
      };
    }, //starting style for card
    keys: (item) => item.key,
    enter: (item) => async (next, cancel) => {
      await next({ opacity: 1, z: 1, x: 0, y: 0 });
      await next({ x: item.finalX, y: item.finalY })
     
    },
    leave: (item) => async (next) => {
      //x and y are the amount to move item.startX by to get it to where we want
      await next({ opacity: 0, z: 0 });
      //await next({ opacity: 0});
    }, //animation triggered after it's told to GTFO. e.g. scale(0) //reverse pop
    onRest: (result, ctrl, item) => {
      setItems((state) =>
        state.filter((i) => {
          return i.key !== item.key;
        })
      );
    }, //remove from array i.e.  leave

    //not too sure what this does. think it's for handling the cancel? e.g. when pressing 'X'
    config: (item, index, phase) => (key) =>
      phase === "enter" && key === "life" ? { duration: timeout } : config, //setting config per stage
  });

  //on load get all children and add them to state
  useEffect(() => {
    children(({ startX, startY, finalX, finalY, cardResource }) => {
      //TODO: get/calculate startX, startY etc here
      setItems((state) => [
        ...state,
        { key: id++, startX, startY, finalX, finalY, cardResource },
      ]);
    });
  }, []);

  return (
    <div>
      {transitions(({ ...style }, item) => {
        return (
          <div>
            <Card
              resource={item.cardResource}
              ref={(ref) => ref && refMap.set(item, ref)}
              style={{
                ...style,
                position: "absolute",
                left: item.startX,
                top: item.startY,
                willChange: "transform",
                zIndex: 5,
                transform: style.z
                  .to({
                    range: [0, 0.5, 0.75, 1],
                    output: [0.01, 0.65, 1.3, 1],
                  })
                  .to((z) => `scale(${z})`),
                width: width,
                height: height,
              }}
             />
              {/* this is your cardAnim thing */}
          </div>
        );
      })}
    </div>
  );
}

// export const CatanBoardWithEffects = EffectsBoardWrapper(CatanBoard, {
//   // Wait until all effects have finished before updating state.
//   updateStateAfterEffects: true,
// });
