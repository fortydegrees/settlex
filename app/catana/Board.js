import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom"; // Added for createPortal

import { Tile } from "./Tile";
import { Node } from "./Node";
import { ActionNode } from "./ActionNode";
import { Edge } from "./Edge";
import { Port } from "./Port";
import { Card } from "./Card";
import "./Board.css";
import { SQRT3, tilePixelVector } from "./utils/coordinates";
import useWindowSize from "./utils/useWindowSize";
import { useLatestPropsOnEffect, useEffectListener } from "bgio-effects/react";
import { useTransition, animated } from "@react-spring/web";
import { TileTypes } from "./game/types";
import { buildableNodes } from "@settlex/game-core";
import { getBuildableEdges } from "./Moves";
import { buildRenderMaps } from "./utils/renderMaps";
import { buildPlayerViewMap } from "./utils/playerView";

const getValidRobberTiles = (G) => {
  //TODO: friendly robber
  const tileIdsExceptRobber = G.tiles
    .filter((tile) => tile.tile.id !== G.core?.robberTileId)
    .map((tile) => tile.tile.id);
  return tileIdsExceptRobber;
};

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

//TODO: allow user to hover/click nodes/edges to build (if their turn and is possible)
export function CatanBoard({
  playerAction,
  setPlayerAction,
  isMobile,
  ctx,
  G,
  moves,
  isActive,
}) {

  //surely gotta be state...
  const buildings = [];
  const actions = [];

  const [portalNode, setPortalNode] = useState(null); // State to hold the portal DOM node

  useEffect(() => {
    // Create a div to be the portal target
    const node = document.createElement("div");
    node.id = "card-animation-portal-root"; // Optional: for easier debugging
    document.body.appendChild(node);
    setPortalNode(node);

    // Cleanup function to remove the div when the component unmounts
    return () => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
      setPortalNode(null);
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  //we do this so that the board updates while the cardContainer is waiting to be updated after animation
  G = useLatestPropsOnEffect("distributeCardsFromTile").G;
  ctx = useLatestPropsOnEffect("distributeCardsFromTile").ctx;

  //from https://github.com/blunket/camelot/blob/master/src/Board.jsx
  // let isMyTurn = this.props.playerID === this.props.ctx.currentPlayer;
  // let amISpectating = this.props.playerID !== "0" && this.props.playerID !== "1";

  //TODO: sort out state/memos/effects for rendering efficiency
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredTiles, setHoveredTiles] = useState([]);
  const [flashingTiles, setFlashingTiles] = useState([]);
  const [robberTiles, setRobberTiles] = useState([]);

  const [buildableRoads, setBuildableRoads] = useState([])
  const mainBuildableNodes = useMemo(() => {
    if (!G.core) return [];
    const isPlacement = ctx.phase === "placement";
    if (playerAction === "placeSettlement") {
      return buildableNodes(G.core, G.coreTopology, ctx.currentPlayer, {
        initialPlacement: isPlacement
      });
    }
    if (playerAction === "placeCity") {
      return Object.entries(G.core.buildingsByNodeId ?? {}).flatMap(
        ([nodeId, building]) =>
          building.ownerId === ctx.currentPlayer && building.type === "settlement"
            ? [Number(nodeId)]
            : []
      );
    }
    return [];
  }, [G.core, G.coreTopology, ctx.currentPlayer, ctx.phase, playerAction]);

  const ref = useRef(null); //ref for card anims
  const divRef = useRef(null); //ref for whole page (to get x/y for card holders)
  const { width, height } = useWindowSize();
  // TODO: Keep in sync with CSS
  const containerHeight = height - 144 - 38 - 40;
  //const containerWidth = isMobile ? width - 280 : width;
  const containerWidth = width;
  const center = [containerWidth / 2, containerHeight / 2];
  const size = computeDefaultSize(containerWidth, containerHeight);
  const { nodeRenderById, edgeRenderById } = useMemo(
    () => buildRenderMaps(G.tiles),
    [G.tiles]
  );
  const playerViewMap = useMemo(() => buildPlayerViewMap(G.core), [G.core]);
  const currentPlayerView = playerViewMap[ctx.currentPlayer];

  //only render actionNodes if it's player's turn.
  //then have functions for canBuildSettlement etc
  //take in player object (which includes number of cards, number of roads left etc)
  //returns edge or node IDs

  //so there's like two states:
  //when player is explicitly placing a road (e.g. has pressed button, only show possible road locations)
  //hovering

  //so basically every node and edge needs to have hoveredNode or w/e
  //and we render it from here if it's in hovered/FlashingTiles..

  //probably only render it if phase == "main"
  // if (isActive && ctx.phase === "main"){
  //   //before we do calculation check that user has resources/roads left
  //   if (canPlaceRoad(player)){
  //     calculateRoadPlacements(player, board)
  //   }
  // }

  // Check if player can build a road (has resources, is their turn, in postRoll)
  const canBuildRoad = useMemo(() => {
    if (!isActive || ctx.phase !== "main") return false;
    if (ctx.activePlayers?.[ctx.currentPlayer] !== "postRoll") return false;
    
    const playerState = G.core?.playerStateById?.[ctx.currentPlayer];
    if (!playerState) return false;
    if (playerState.roadsRemaining < 1) return false;
    
    const resources = playerState.resources ?? [];
    const hasWood = resources.includes("Wood");
    const hasBrick = resources.includes("Brick");
    return hasWood && hasBrick;
  }, [isActive, ctx.phase, ctx.activePlayers, ctx.currentPlayer, G.core]);

  // Passive hoverable edges - shown when player CAN build but hasn't clicked the button
  const passiveBuildableEdges = useMemo(() => {
    if (!canBuildRoad || playerAction === "placeRoad") return [];
    if (!G.core || !G.coreTopology) return [];
    return getBuildableEdges(ctx.currentPlayer, G, ctx);
  }, [canBuildRoad, playerAction, G, ctx]);

  useEffect(()=>{
    if (playerAction === "placeRoad" && G.core && G.coreTopology) {
      const buildable = getBuildableEdges(ctx.currentPlayer, G, ctx)
      setBuildableRoads(buildable)
    }
    else{
      setBuildableRoads([])
    }
  }, [playerAction, G, ctx])

  

  useEffectListener(
    "distributeCardsFromTile",
    (cards) => {
      //flash tiles
      setFlashingTiles(cards.map((c) => c.tile.tile.id));
      //wait one second (for tiles to flash) then distribute cards
      setTimeout(() => {
        const divRect = divRef.current.getBoundingClientRect(); // Get board's viewport offset and size

        for (const card of cards) {
          const { tile, playerID } = card;

          const [centerX, centerY] = center;
          const [tilePosX, tilePosY] = tilePixelVector( // tilePos X,Y relative to board's center
            tile.coordinate,
            size,
            centerX,
            centerY
          );

          const cardWidth = size * 0.5;

          // Calculate card's initial X,Y relative to the board's origin (divRef)
          const initialCardXRelToBoard = tilePosX - cardWidth / 2 + (Math.floor(Math.random() * 5) - 2);
          const initialCardYRelToBoard = tilePosY - size + (Math.floor(Math.random() * 10) - 4);
          
          // Convert to viewport-absolute coordinates
          const viewportStartX = divRect.left + initialCardXRelToBoard;
          const viewportStartY = divRect.top + initialCardYRelToBoard;

          const cardResource = tile.tile.resource;

          const element = document.getElementById(
            `p${playerID}-${cardResource}`
          );

          const rect = element.getBoundingClientRect(); // Target element's viewport coordinates
          
          const xRelativeToDiv = rect.left - divRect.left;
          const yRelativeToDiv = rect.top - divRect.top;

          // finalX and finalY are deltas relative to the card's starting position.
          // These are calculated based on the target's position relative to the board,
          // and the card's initial position relative to the board.
          // This logic remains correct as it calculates the difference needed.
          const finalX = xRelativeToDiv - initialCardXRelToBoard;
          const finalY = yRelativeToDiv - initialCardYRelToBoard - 15;

          ref.current?.({ startX: viewportStartX, startY: viewportStartY, finalX, finalY, cardResource });
        }
        setFlashingTiles([]); // Moved outside the loop
      }, 1000);
    },
    [width, height, size, center] // Added center to dependencies
  );

  //for displaying actionNodes based on stage the player is in (e.g. moving robber)
  //NOT for building road, as this is not a stage
  useEffect(() => {
    if (Object.entries(ctx.activePlayers).flat().includes("moveRobber")) {
      var robberTiles = getValidRobberTiles(G);
      setRobberTiles(robberTiles);
    }
    
    else {
      setRobberTiles([]);
    }
  }, [ctx.activePlayers]);

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
    //hack. CLEAN
    if (type == TileTypes.LAND) {
      return (
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
          hasRobber={tile.id == G.core?.robberTileId}
          canPlaceRobber={robberTiles && robberTiles.includes(tile.id)}
          moves={moves}
        />
      );
    } else if (type == TileTypes.PORT) {
      return (
        <Port
          key={tile.id}
          boardCenter={center}
          size={size}
          coordinate={coordinate}
          tile={tile}
        />
      );
    }
  });


  Object.entries(G.core?.buildingsByNodeId ?? {}).forEach(
    ([nodeId, building]) => {
      const renderNode = nodeRenderById[String(nodeId)];
      const owner = playerViewMap[building.ownerId];
      if (!renderNode || !owner) {
        return;
      }

      buildings.push(
        <Node
          key={nodeId}
          nodeId={nodeId}
          tileId={renderNode.tileId}
          center={center}
          size={size}
          coordinate={renderNode.tile_coordinate}
          direction={renderNode.direction}
          buildingType={building.type}
          buildingColor={owner.color}
        />
      );
    }
  );

  Object.entries(G.core?.roadsByEdgeId ?? {}).forEach(([edgeId, ownerId]) => {
    const renderEdge = edgeRenderById[edgeId];
    const owner = playerViewMap[ownerId];
    if (!renderEdge || !owner) {
      return;
    }

    buildings.push(
      <Edge
        key={edgeId}
        id={edgeId}
        center={center}
        size={size}
        coordinate={renderEdge.tile_coordinate}
        direction={renderEdge.direction}
        color={owner.color}
      />
    );
  });

  //TODO: i think we need to just render nodes.
  //as in, right now we render all nodes and just hide it if it's not actionable
  //we only need to do this if it's the player's turn
  
  {
    isActive &&
      (() => {
        const isPlacement = ctx.phase === "placement";
        const showMainNodes =
          playerAction === "placeSettlement" || playerAction === "placeCity";
        const nodeActionIds = isPlacement ? G.valids.nodes : mainBuildableNodes;
        const nodeActionType = isPlacement
          ? ctx.activePlayers[ctx.currentPlayer]
          : playerAction === "placeCity"
            ? "city"
            : "settlement";

        if (!isPlacement && !showMainNodes) {
          return null;
        }

        nodeActionIds.forEach((nodeId) => {
          const renderNode = nodeRenderById[String(nodeId)];
          if (!renderNode) {
            return;
          }

          actions.push(
            <ActionNode
              key={nodeId}
              nodeId={nodeId}
              center={center}
              size={size}
              coordinate={renderNode.tile_coordinate}
              direction={renderNode.direction}
              buildingType={nodeActionType}
              buildingColor={currentPlayerView?.color ?? "red"}
              flashing={isActive}
              onClick={() => {
                if (nodeActionType === "city") {
                  moves.placeCity(nodeId);
                } else {
                  moves.placeSettlement(nodeId);
                }
                setHoveredNode(null);
                setHoveredTiles([]);
                setPlayerAction(null);
              }}
              setHoveredNode={setHoveredNode}
              hoveredNode={hoveredNode}
            />
          );
        });
        return null;
      })();
  }

  //editable edges e.g placing road during initial placement
  {
    isActive &&
      G.valids.edges.map((edgeId, x) => {
        const renderEdge = edgeRenderById[edgeId];
        if (!renderEdge) {
          return null;
        }

        actions.push(
          <Edge
            key={edgeId}
            id={edgeId}
            center={center}
            size={size}
            coordinate={renderEdge.tile_coordinate}
            direction={renderEdge.direction}
            color={currentPlayerView?.color ?? "red"}
            placing
            initialPlacement
            moves={moves}
            setHoveredNode={setHoveredNode}
            setPlayerAction={setPlayerAction}
            hoveredNode={hoveredNode}
          />
        );
        return null;
      });
  }

  buildableRoads.map((edgeId, x) => {
    const renderEdge = edgeRenderById[edgeId];
    if (!renderEdge) {
      return null;
    }
    actions.push(
      <Edge
        key={`buildable-${edgeId}`}
        id={edgeId}
        center={center}
        size={size}
        coordinate={renderEdge.tile_coordinate}
        direction={renderEdge.direction}
        color={currentPlayerView?.color ?? "red"}
        placing
        initialPlacement={false}
        moves={moves}
        setHoveredNode={setHoveredNode}
        setPlayerAction={setPlayerAction}
        hoveredNode={hoveredNode}
      />
    );
    return null;
  });

  //make a subgraph of buildable nodes - used in catanatron
  //https://github.com/bcollazo/catanatron/blob/425ccdef04921d1756a1c9bb1f904fceb1f3c3d3/catanatron_core/catanatron/models/board.py#L148
  //but we don't do this as we don't generate water tiles.. yet..
  //const buildable_subgraph = STATIC_GRAPH.subgraph(landNodes)

  console.log("board render ");
  return (
    <div ref={divRef}>
      {" "}
      {portalNode && ( // Only render CardAnimContainer if portalNode exists
        <CardAnimContainer
          portalNode={portalNode} // Pass the portal node as a prop
          //style={{ position: "absolute" }}
          size={size}
        >
          {(add) => {
            ref.current = add;
          }}
        </CardAnimContainer>
      )}
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
  portalNode, // Added portalNode prop
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
      await next({ x: item.finalX, y: item.finalY });
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

  const cardAnimations = (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, pointerEvents: 'none' }}>
      {transitions(({ ...style }, item) => {
        return (
          <div key={item.key}>
            <Card
              resource={item.cardResource}
              ref={(ref) => ref && refMap.set(item, ref)}
              style={{
                ...style,
                position: "absolute",
                left: item.startX, // Will now be viewport-absolute
                top: item.startY,  // Will now be viewport-absolute
                willChange: "transform",
                zIndex: 5, // zIndex within this fixed container
                transform: style.z
                  .to({
                    range: [0, 0.5, 0.75, 1],
                    output: [0.01, 0.65, 1.3, 1],
                  })
                  .to((z) => `scale(${z})`),
                width: width,
                height: height,
                // pointerEvents: 'auto', // Add if cards themselves need to be interactive
              }}
            />
            {/* this is your cardAnim thing */}
          </div>
        );
      })}
    </div>
  );

  if (!portalNode) {
    return null; // Or some fallback if needed, though CatanBoard should prevent this
  }

  return ReactDOM.createPortal(cardAnimations, portalNode);
}

// export const CatanBoardWithEffects = EffectsBoardWrapper(CatanBoard, {
//   // Wait until all effects have finished before updating state.
//   updateStateAfterEffects: true,
// });
