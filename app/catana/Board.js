import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

import { Tile } from "./Tile";
import { Node } from "./Node";
import { ActionNode } from "./ActionNode";
import { Edge } from "./Edge";
import { Port } from "./Port";
import { RobberPlacementPreview } from "./RobberPlacementPreview";
import { BuildPlacementPreview } from "./BuildPlacementPreview";
import { BoardUnderlay } from "./BoardUnderlay";
import { BoardPortChannels } from "./BoardPortChannels";
import "./Board.css";
import { getBoardLayout } from "./utils/boardLayout";
import useWindowSize from "./utils/useWindowSize";
import {
  useLatestPropsOnEffect,
  useEffectListener,
  useEffectState
} from "bgio-effects/react";
import { TileTypes } from "./types";
import {
  buildableNodes,
  canBuildCity as coreCanBuildCity,
  canBuildRoad as coreCanBuildRoad,
  canBuildSettlement as coreCanBuildSettlement,
  canPlaceRobber
} from "@settlex/game-core";
import { getBuildableEdges } from "./Moves";
import { buildRenderMaps } from "./utils/renderMaps";
import { buildPlayerViewMap } from "./utils/playerView";
import { resolveRobberPlacementMotionMode } from "./utils/robberPlacementMotion";
import { isDocumentHidden } from "./utils/visibility";
import { tilePixelVector } from "./utils/coordinates";
import { isPassiveBuildEnabled } from "./utils/passiveBuildMode";
import { getBuildPickupPieceType } from "./utils/playerAction";

const getValidRobberTiles = (G) => {
  // Use core function for validation
  if (!G.core) return [];
  
  const tileIdsExceptRobber = G.tiles
    .filter((tile) => tile.tile.id !== G.core?.robberTileId)
    .filter((tile) => canPlaceRobber(G.core, G.coreTopology, tile.tile.id))
    .map((tile) => tile.tile.id);
  
  return tileIdsExceptRobber;
};


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
  buildPickup,
  setBuildPickup,
  robberPlacementMotionMode,
  boardViewportScale = 1,
  themeId,
  isMobile,
  playerID,
  ctx,
  G,
  moves,
  isActive,
  playerColorMap,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
}) {

  //surely gotta be state...
  const buildings = [];
  const actions = [];

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
  const [blockedFlashingTiles, setBlockedFlashingTiles] = useState([]);
  const [robberTiles, setRobberTiles] = useState([]);
  const [hoveredRobberTarget, setHoveredRobberTarget] = useState(null);
  const [robberTargetElementsByTileId, setRobberTargetElementsByTileId] = useState(
    {}
  );
  const [buildTargetElementsById, setBuildTargetElementsById] = useState({});
  const [buildPickupPresentation, setBuildPickupPresentation] = useState({
    targetId: null,
    showTargetPreview: false
  });
  const [suppressBuildHighlights, setSuppressBuildHighlights] = useState(false);
  const [localPendingCityNodeId, setLocalPendingCityNodeId] = useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hasCoarsePointer, setHasCoarsePointer] = useState(false);

  const [buildableRoads, setBuildableRoads] = useState([])
  const playerStage = ctx.activePlayers?.[playerID] ?? null;
  const isCurrentPlayerPerspective =
    playerID != null && String(ctx.currentPlayer) === String(playerID);
  const isInteractiveStageOwner = isCurrentPlayerPerspective && playerStage != null;
  const isPlacementSettlementStage =
    ctx.phase === "placement" && playerStage === "settlement";
  const isPlacementRoadStage =
    ctx.phase === "placement" && playerStage === "road";
  const mainBuildableNodes = useMemo(() => {
    if (!G.core || !playerID || !isCurrentPlayerPerspective) return [];
    const isPlacement = ctx.phase === "placement";
    if (playerAction === "placeSettlement") {
      return buildableNodes(G.core, G.coreTopology, playerID, {
        initialPlacement: isPlacement
      });
    }
    if (playerAction === "placeCity") {
      return Object.entries(G.core.buildingsByNodeId ?? {}).flatMap(
        ([nodeId, building]) =>
          building.ownerId === playerID && building.type === "settlement"
            ? [Number(nodeId)]
            : []
      );
    }
    return [];
  }, [G.core, G.coreTopology, ctx.phase, playerAction, playerID, isCurrentPlayerPerspective]);

  const divRef = useRef(null); //ref for whole page (to get x/y for card holders)
  const { width, height } = useWindowSize();
  // TODO: Keep in sync with CSS
  const { containerWidth, containerHeight, center, size } = getBoardLayout({
    width,
    height,
  });
  const [boardCenterX, boardCenterY] = center;
  const { nodeRenderById, edgeRenderById } = useMemo(
    () => buildRenderMaps(G.tiles),
    [G.tiles]
  );
  const playerViewMap = useMemo(
    () => buildPlayerViewMap(G.core, playerColorMap),
    [G.core, playerColorMap]
  );
  const currentPlayerView = playerViewMap[ctx.currentPlayer];
  const explicitBuildPieceType = getBuildPickupPieceType(playerAction);
  const activeBuildPickupPieceType = buildPickup?.pieceType ?? null;
  const isBuildPickupActive =
    isInteractiveStageOwner &&
    ctx.phase === "main" &&
    G.core?.phase === "normal" &&
    activeBuildPickupPieceType != null &&
    activeBuildPickupPieceType === explicitBuildPieceType;
  const isRobberPlacementActive =
    isInteractiveStageOwner && playerStage === "moveRobber";
  const activeBuildPresentationTargetId = buildPickupPresentation.showTargetPreview
    ? buildPickupPresentation.targetId
    : null;
  const resolvedRobberPlacementMotionMode = useMemo(
    () =>
      resolveRobberPlacementMotionMode({
        requestedMode: robberPlacementMotionMode,
        prefersReducedMotion,
        hasCoarsePointer
      }),
    [robberPlacementMotionMode, prefersReducedMotion, hasCoarsePointer]
  );

  const [placePiecePayload, isPlacePieceActive] = useEffectState("placePiece");
  const activeCityPlacementId =
    isPlacePieceActive && placePiecePayload?.pieceType === "city"
      ? Number(placePiecePayload.id)
      : null;
  const effectiveCityPlacementId =
    activeCityPlacementId ?? localPendingCityNodeId;

  useEffect(() => {
    if (
      localPendingCityNodeId != null &&
      activeCityPlacementId === localPendingCityNodeId
    ) {
      setLocalPendingCityNodeId(null);
    }
  }, [localPendingCityNodeId, activeCityPlacementId]);

  useEffect(() => {
    if (isBuildPickupActive) {
      return;
    }

    setBuildPickupPresentation((currentPresentation) =>
      currentPresentation.targetId == null && !currentPresentation.showTargetPreview
        ? currentPresentation
        : { targetId: null, showTargetPreview: false }
    );
  }, [isBuildPickupActive]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const updateMotionPreferences = () => {
      setPrefersReducedMotion(reducedMotionQuery.matches);
      setHasCoarsePointer(coarsePointerQuery.matches);
    };
    const subscribe = (query, handler) => {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", handler);
        return () => query.removeEventListener("change", handler);
      }
      if (typeof query.addListener === "function") {
        query.addListener(handler);
        return () => query.removeListener(handler);
      }
      return () => {};
    };

    updateMotionPreferences();
    const unsubscribeReducedMotion = subscribe(
      reducedMotionQuery,
      updateMotionPreferences
    );
    const unsubscribeCoarsePointer = subscribe(
      coarsePointerQuery,
      updateMotionPreferences
    );

    return () => {
      unsubscribeReducedMotion();
      unsubscribeCoarsePointer();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const previousBodyCursor = document.body.style.cursor;
    const previousDocumentCursor = document.documentElement.style.cursor;
    if (isRobberPlacementActive || isBuildPickupActive) {
      document.body.style.cursor = "grabbing";
      document.documentElement.style.cursor = "grabbing";
    }

    return () => {
      document.body.style.cursor = previousBodyCursor;
      document.documentElement.style.cursor = previousDocumentCursor;
    };
  }, [isBuildPickupActive, isRobberPlacementActive]);

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
  // if (isInteractiveStageOwner && ctx.phase === "main"){
  //   //before we do calculation check that user has resources/roads left
  //   if (canPlaceRoad(player)){
  //     calculateRoadPlacements(player, board)
  //   }
  // }

  const passiveBuildEnabled = useMemo(
    () =>
      isPassiveBuildEnabled({
        playerAction,
        playerID,
        ctx,
        corePhase: G.core?.phase,
        devCardPlay: G.devCardPlay
      }),
    [playerAction, playerID, ctx, G.core?.phase, G.devCardPlay]
  );

  // Passive hoverable edges - shown when player CAN build but hasn't clicked the button
  const passiveBuildableEdges = useMemo(() => {
    if (!passiveBuildEnabled || !playerID) return [];
    if (!G.core || !G.coreTopology) return [];
    if (!coreCanBuildRoad(G.core, playerID).ok) return [];
    return getBuildableEdges(playerID, G, ctx);
  }, [passiveBuildEnabled, G, ctx, playerID]);

  const passiveSettlementNodes = useMemo(() => {
    if (!passiveBuildEnabled || !playerID) return [];
    if (!G.core || !G.coreTopology) return [];
    if (!coreCanBuildSettlement(G.core, playerID).ok) return [];
    return buildableNodes(G.core, G.coreTopology, playerID, {
      initialPlacement: false
    });
  }, [passiveBuildEnabled, G.core, G.coreTopology, playerID]);

  const passiveCityNodes = useMemo(() => {
    if (!passiveBuildEnabled || !playerID || !G.core) return [];
    if (!coreCanBuildCity(G.core, playerID).ok) return [];
    return Object.entries(G.core.buildingsByNodeId ?? {}).flatMap(
      ([nodeId, building]) =>
        building.ownerId === playerID && building.type === "settlement"
          ? [Number(nodeId)]
          : []
    );
  }, [passiveBuildEnabled, G.core, playerID]);

  const passiveCityNodeSet = useMemo(
    () => new Set(passiveCityNodes),
    [passiveCityNodes]
  );

  useEffect(()=>{
    if (
      playerID &&
      isCurrentPlayerPerspective &&
      (playerAction === "placeRoad" || playerAction === "roadBuilding") &&
      G.core &&
      G.coreTopology
    ) {
      const buildable = getBuildableEdges(playerID, G, ctx)
      setBuildableRoads(buildable)
    }
    else{
      setBuildableRoads([])
    }
  }, [playerAction, G, ctx, playerID, isCurrentPlayerPerspective])

  const lastBoardStateRef = useRef({
    phase: ctx.phase,
    currentPlayer: ctx.currentPlayer,
    activePlayers: ctx.activePlayers,
    core: G.core
  });

  useEffect(() => {
    const last = lastBoardStateRef.current;
    const stateChanged =
      last.phase !== ctx.phase ||
      last.currentPlayer !== ctx.currentPlayer ||
      last.activePlayers !== ctx.activePlayers ||
      last.core !== G.core;

    if (suppressBuildHighlights && stateChanged) {
      setSuppressBuildHighlights(false);
    }

    lastBoardStateRef.current = {
      phase: ctx.phase,
      currentPlayer: ctx.currentPlayer,
      activePlayers: ctx.activePlayers,
      core: G.core
    };
  }, [ctx.phase, ctx.currentPlayer, ctx.activePlayers, G.core, suppressBuildHighlights]);

  const handleBuildCommit = () => {
    setSuppressBuildHighlights(true);
    setBuildPickup(null);
  };

  // placePiece effects keep state updates delayed; use active effect to suppress overlaps

  

  useEffectListener(
    "distributeCardsFromTile",
    (payload) => {
      if (isDocumentHidden()) {
        return;
      }
      // payload can be: { cards, blockedTileIds } or just cards array (legacy)
      const cards = Array.isArray(payload) ? payload : payload.cards || [];
      const blockedTileIds = Array.isArray(payload) ? [] : payload.blockedTileIds || [];

      // Flash all tiles simultaneously (producing + blocked)
      setFlashingTiles(cards.map((c) => c.tileId));
      setBlockedFlashingTiles(blockedTileIds);

      // Clear flashing after buffer
      setTimeout(() => {
        setFlashingTiles([]);
        setBlockedFlashingTiles([]);
      }, cards.length * 10 + 1500);
    },
    [width, height, size, center]
  );

  // Keep robberBlocked listener for standalone blocked scenarios (no distributions)
  useEffectListener(
    "robberBlocked",
    (blockedTileIds) => {
      // Only handle if not already handled by distributeCardsFromTile
      if (blockedFlashingTiles.length === 0) {
        setBlockedFlashingTiles(blockedTileIds);
        setTimeout(() => {
          setBlockedFlashingTiles([]);
        }, 1500);
      }
    },
    [blockedFlashingTiles]
  );

  //for displaying actionNodes based on stage the player is in (e.g. moving robber)
  //NOT for building road, as this is not a stage
  useEffect(() => {
    if (isRobberPlacementActive) {
      setRobberTiles(getValidRobberTiles(G));
      return;
    }

    setRobberTiles([]);
    setHoveredRobberTarget(null);
    setRobberTargetElementsByTileId({});
  }, [isRobberPlacementActive, G]);

  useEffect(() => {
    if (isBuildPickupActive) {
      return;
    }

    setBuildTargetElementsById({});
  }, [isBuildPickupActive]);

  useEffect(() => {
    if (resolvedRobberPlacementMotionMode !== "playful") {
      setHoveredRobberTarget(null);
    }
  }, [resolvedRobberPlacementMotionMode]);

  useEffect(() => {
    if (isPlacementSettlementStage) {
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
      return;
    }
    setHoveredTiles([]);
  }, [hoveredNode, G.tiles, isPlacementSettlementStage]);

  const handleRobberTargetHoverChange = useCallback((payload) => {
    if (!payload?.element?.getBoundingClientRect) {
      setHoveredRobberTarget(null);
      return;
    }

    const rect = payload.element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
      setHoveredRobberTarget(null);
      return;
    }

    setHoveredRobberTarget({
      tileId: payload.tileId,
      centerX,
      centerY
    });
  }, []);

  const handleRobberTargetRegister = useCallback(({ tileId, element }) => {
    setRobberTargetElementsByTileId((currentTargets) => {
      const currentElement = currentTargets[tileId] ?? null;
      const nextElement = element ?? null;

      if (currentElement === nextElement) {
        return currentTargets;
      }

      if (!nextElement) {
        if (!(tileId in currentTargets)) {
          return currentTargets;
        }

        const nextTargets = { ...currentTargets };
        delete nextTargets[tileId];
        return nextTargets;
      }

      return {
        ...currentTargets,
        [tileId]: nextElement
      };
    });
  }, []);

  const handleBuildTargetRegister = useCallback(
    ({ targetId, element, rotationDegrees = 0 }) => {
      const normalizedTargetId = String(targetId);
      setBuildTargetElementsById((currentTargets) => {
        const currentEntry = currentTargets[normalizedTargetId] ?? null;
        const nextElement = element ?? null;
        const nextRotation = rotationDegrees ?? 0;

        if (
          currentEntry?.element === nextElement &&
          currentEntry?.rotationDegrees === nextRotation
        ) {
          return currentTargets;
        }

        if (!nextElement) {
          if (!(normalizedTargetId in currentTargets)) {
            return currentTargets;
          }

          const nextTargets = { ...currentTargets };
          delete nextTargets[normalizedTargetId];
          return nextTargets;
        }

        return {
          ...currentTargets,
          [normalizedTargetId]: {
            element: nextElement,
            rotationDegrees: nextRotation
          }
        };
      });
    },
    []
  );

  const magneticRobberTargets = useMemo(
    () =>
      robberTiles
        .map((tileId) => ({
          tileId,
          element: robberTargetElementsByTileId[tileId]
        }))
        .filter((target) => Boolean(target.element)),
    [robberTiles, robberTargetElementsByTileId]
  );
  const landRobberPreviewTiles = useMemo(() => {
    if (!size) {
      return [];
    }

    return G.tiles.flatMap(({ coordinate, type, tile }) => {
      if (type !== TileTypes.LAND) {
        return [];
      }

      const [tileCenterX, tileCenterY] = tilePixelVector(
        coordinate,
        size,
        boardCenterX,
        boardCenterY
      );

      return [
        {
          tileId: tile.id,
          centerX: tileCenterX,
          centerY: tileCenterY
        }
      ];
    });
  }, [G.tiles, size, boardCenterX, boardCenterY]);

  const magneticBuildTargets = useMemo(() => {
    if (!isBuildPickupActive) {
      return [];
    }

    if (activeBuildPickupPieceType === "road") {
      return buildableRoads
        .map((edgeId) => {
          const target = buildTargetElementsById[String(edgeId)] ?? null;
          if (!target?.element) {
            return null;
          }

          return {
            id: edgeId,
            element: target.element,
            rotationDegrees: target.rotationDegrees ?? 90
          };
        })
        .filter(Boolean);
    }

    return mainBuildableNodes
      .map((nodeId) => {
        const target = buildTargetElementsById[String(nodeId)] ?? null;
        if (!target?.element) {
          return null;
        }

        return {
          id: nodeId,
          element: target.element,
          rotationDegrees: 0
        };
      })
      .filter(Boolean);
  }, [
    activeBuildPickupPieceType,
    buildTargetElementsById,
    buildableRoads,
    isBuildPickupActive,
    mainBuildableNodes
  ]);

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
          isBlockedFlashing={blockedFlashingTiles.includes(tile.id)}
          hasRobber={tile.id == G.core?.robberTileId}
          showOriginRobber={
            isRobberPlacementActive && tile.id == G.core?.robberTileId
          }
          canPlaceRobber={robberTiles && robberTiles.includes(tile.id)}
          showRobberHoverGhost={resolvedRobberPlacementMotionMode === "minimal"}
          onRobberTargetHoverChange={handleRobberTargetHoverChange}
          onRobberTargetRegister={handleRobberTargetRegister}
          moves={moves}
          themeId={themeId}
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
          themeId={themeId}
        />
      );
    }
  });

  Object.entries(G.core?.buildingsByNodeId ?? {}).forEach(
    ([nodeId, building]) => {
      const numericNodeId = Number(nodeId);
      const renderNode = nodeRenderById[String(nodeId)];
      const owner = playerViewMap[building.ownerId];
      if (!renderNode || !owner) {
        return;
      }
      const isCityUpgradeHover =
        playerAction === "placeCity" && hoveredNode === numericNodeId;
      const isPassiveCityUpgradeHover =
        passiveCityNodeSet.has(hoveredNode) && hoveredNode === numericNodeId;
      const isCityUpgradePending = effectiveCityPlacementId === numericNodeId;
      if (
        building.type === "settlement" &&
        (isCityUpgradeHover || isPassiveCityUpgradeHover || isCityUpgradePending)
      ) {
        return;
      }
      if (building.type === "city" && isCityUpgradePending) {
        return;
      }

      buildings.push(
        <Node
          key={nodeId}
          nodeId={numericNodeId}
          tileId={renderNode.tileId}
          center={center}
          size={size}
          coordinate={renderNode.tile_coordinate}
          direction={renderNode.direction}
          buildingType={building.type}
          buildingColor={owner.color}
          themeId={themeId}
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
        themeId={themeId}
      />
    );
  });

  //TODO: i think we need to just render nodes.
  //as in, right now we render all nodes and just hide it if it's not actionable
  //we only need to do this if it's the player's turn
  
  {
    !suppressBuildHighlights &&
      (() => {
        const showPlacementNodes = isPlacementSettlementStage;
        const showMainNodes =
          isInteractiveStageOwner &&
          (playerAction === "placeSettlement" || playerAction === "placeCity");
        const nodeActionIds = showPlacementNodes ? G.valids.nodes : mainBuildableNodes;
        const nodeActionType = showPlacementNodes
          ? "settlement"
          : playerAction === "placeCity"
            ? "city"
            : "settlement";

        if (!showPlacementNodes && !showMainNodes) {
          return null;
        }

        nodeActionIds.forEach((nodeId) => {
          const renderNode = nodeRenderById[String(nodeId)];
          if (!renderNode) {
            return;
          }
          if (nodeActionType === "city" && effectiveCityPlacementId === nodeId) {
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
              flashing={isInteractiveStageOwner}
              onClick={() => {
                handleBuildCommit();
                if (nodeActionType === "city") {
                  setLocalPendingCityNodeId(nodeId);
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
              registerBuildTarget={
                showMainNodes ? handleBuildTargetRegister : null
              }
              showRegisteredHoverPreview={
                activeBuildPresentationTargetId === nodeId
              }
              themeId={themeId}
            />
          );
        });
        return null;
      })();
  }

  //editable edges e.g placing road during initial placement
  {
    !suppressBuildHighlights &&
    isPlacementRoadStage &&
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
            onPlaceCommitted={handleBuildCommit}
            themeId={themeId}
          />
        );
        return null;
      });
  }

  {
    !suppressBuildHighlights &&
      passiveBuildEnabled &&
      passiveBuildableEdges.map((edgeId) => {
        const renderEdge = edgeRenderById[edgeId];
        if (!renderEdge) {
          return null;
        }
        actions.push(
          <Edge
            key={`passive-road-${edgeId}`}
            id={edgeId}
            center={center}
            size={size}
            coordinate={renderEdge.tile_coordinate}
            direction={renderEdge.direction}
            color={currentPlayerView?.color ?? "red"}
            hoverable
            moves={moves}
            setHoveredNode={setHoveredNode}
            hoveredNode={hoveredNode}
            onPlaceCommitted={handleBuildCommit}
            themeId={themeId}
          />
        );
        return null;
      });
  }

  {
    !suppressBuildHighlights &&
      passiveBuildEnabled &&
      passiveSettlementNodes.map((nodeId) => {
        const renderNode = nodeRenderById[String(nodeId)];
        if (!renderNode) {
          return null;
        }
        actions.push(
          <ActionNode
            key={`passive-settlement-${nodeId}`}
            nodeId={nodeId}
            center={center}
            size={size}
            coordinate={renderNode.tile_coordinate}
            direction={renderNode.direction}
            buildingType="settlement"
            buildingColor={currentPlayerView?.color ?? "red"}
            onClick={() => {
              handleBuildCommit();
              moves.placeSettlement(nodeId);
              setHoveredNode(null);
              setHoveredTiles([]);
            }}
            setHoveredNode={setHoveredNode}
            hoveredNode={hoveredNode}
            showIdleCircle={false}
            themeId={themeId}
          />
        );
        return null;
      });
  }

  {
    !suppressBuildHighlights &&
      passiveBuildEnabled &&
      passiveCityNodes.map((nodeId) => {
        const renderNode = nodeRenderById[String(nodeId)];
        if (!renderNode || effectiveCityPlacementId === nodeId) {
          return null;
        }
        actions.push(
          <ActionNode
            key={`passive-city-${nodeId}`}
            nodeId={nodeId}
            center={center}
            size={size}
            coordinate={renderNode.tile_coordinate}
            direction={renderNode.direction}
            buildingType="city"
            buildingColor={currentPlayerView?.color ?? "red"}
            onClick={() => {
              handleBuildCommit();
              setLocalPendingCityNodeId(nodeId);
              moves.placeCity(nodeId);
              setHoveredNode(null);
              setHoveredTiles([]);
            }}
            setHoveredNode={setHoveredNode}
            hoveredNode={hoveredNode}
            showIdleCircle={false}
            themeId={themeId}
          />
        );
        return null;
      });
  }

  if (!suppressBuildHighlights) {
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
          roadBuilding={playerAction === "roadBuilding"}
          moves={moves}
          setHoveredNode={setHoveredNode}
          setPlayerAction={setPlayerAction}
          hoveredNode={hoveredNode}
          registerBuildTarget={
            playerAction === "placeRoad" ? handleBuildTargetRegister : null
          }
          showRegisteredHoverPreview={
            activeBuildPresentationTargetId === edgeId
          }
          onPlaceCommitted={handleBuildCommit}
          themeId={themeId}
        />
      );
      return null;
    });
  }

  //make a subgraph of buildable nodes - used in catanatron
  //https://github.com/bcollazo/catanatron/blob/425ccdef04921d1756a1c9bb1f904fceb1f3c3d3/catanatron_core/catanatron/models/board.py#L148
  //but we don't do this as we don't generate water tiles.. yet..
  //const buildable_subgraph = STATIC_GRAPH.subgraph(landNodes)

  console.log("board render ");
  const setBoardRefs = (node) => {
    divRef.current = node;
    if (!boardRef) return;
    if (typeof boardRef === "function") {
      boardRef(node);
    } else {
      boardRef.current = node;
    }
  };

  return (
    <div ref={setBoardRefs}>
      {" "}
      <div className="relative h-screen w-screen">
        <BoardUnderlay center={center} size={size} themeId={themeId} />
        <BoardPortChannels
          tiles={G.tiles}
          center={center}
          size={size}
          width={containerWidth}
          height={containerHeight}
        />
        {tiles}
        <div
          ref={placementRoadLayerRef}
          className="absolute inset-0 pointer-events-none z-0"
        />
        <div
          ref={placementLayerRef}
          className="absolute inset-0 pointer-events-none z-30"
        />
        {resolvedRobberPlacementMotionMode === "playful" &&
        isRobberPlacementActive ? (
          <RobberPlacementPreview
            active
            hoveredTarget={hoveredRobberTarget}
            magneticTargets={magneticRobberTargets}
            landTileCenters={landRobberPreviewTiles}
            boardTileSize={size}
            boardViewportScale={boardViewportScale}
            themeId={themeId}
            size={size / 1.5}
          />
        ) : null}
        {isBuildPickupActive ? (
          <BuildPlacementPreview
            active
            pieceType={activeBuildPickupPieceType}
            pieceColor={currentPlayerView?.color ?? "red"}
            originRect={buildPickup?.originRect ?? null}
            magneticTargets={magneticBuildTargets}
            boardViewportScale={boardViewportScale}
            themeId={themeId}
            size={size}
            prefersReducedMotion={prefersReducedMotion}
            hasCoarsePointer={hasCoarsePointer}
            onPresentationChange={setBuildPickupPresentation}
          />
        ) : null}

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

// export const CatanBoardWithEffects = EffectsBoardWrapper(CatanBoard, {
//   // Wait until all effects have finished before updating state.
//   updateStateAfterEffects: true,
// });
