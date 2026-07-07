"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BoardPortChannels } from "../BoardPortChannels";
import { BoardUnderlay } from "../BoardUnderlay";
import { Port } from "../Port";
import { Tile } from "../Tile";
import { TileTypes } from "../types";
import { DEFAULT_THEME_ID } from "../theme/themes";
import { getBoardLayout } from "../utils/boardLayout";
import { buildRenderMaps } from "../utils/renderMaps";
import useWindowSize from "../utils/useWindowSize";
import { HOME_DEMO_BOARD_PRESET } from "./homeDemoPreset";
import { HOME_DEMO_PLAYER_COLORS } from "./homeDemoSequence";
import { HomeDemoPieceLayer } from "./HomeDemoPieceLayer";

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function HomeDemoBoard({
  pieceState,
  reservedHeight,
  centerYOffset = 0,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
  onBoardMeasuredChange,
  themeId = DEFAULT_THEME_ID
}) {
  const fallbackBoardRef = useRef(null);
  const { width, height, isMeasured } = useWindowSize();
  const layout = useMemo(
    () =>
      getBoardLayout({
        width,
        height,
        reservedUiHeight: reservedHeight
      }),
    [height, reservedHeight, width]
  );
  const renderMaps = useMemo(
    () => buildRenderMaps(HOME_DEMO_BOARD_PRESET.tiles),
    []
  );
  const { size, containerWidth, containerHeight } = layout;
  const center = useMemo(
    () => [layout.center[0], layout.center[1] + centerYOffset],
    [centerYOffset, layout.center]
  );

  useBrowserLayoutEffect(() => {
    onBoardMeasuredChange?.(isMeasured);
  }, [isMeasured, onBoardMeasuredChange]);

  const setBoardRefs = (node) => {
    fallbackBoardRef.current = node;
    if (!boardRef) return;
    if (typeof boardRef === "function") {
      boardRef(node);
    } else {
      boardRef.current = node;
    }
  };

  if (!width || !height || !size) return null;

  return (
    <div
      ref={setBoardRefs}
      data-testid="home-demo-board"
      data-window-size-measured={isMeasured ? "true" : "false"}
      style={{ visibility: isMeasured ? "visible" : "hidden" }}
    >
      <div className="relative h-screen w-screen">
        <BoardUnderlay center={center} size={size} themeId={themeId} />
        <BoardPortChannels
          tiles={HOME_DEMO_BOARD_PRESET.tiles}
          center={center}
          size={size}
          width={containerWidth}
          height={containerHeight}
        />
        {HOME_DEMO_BOARD_PRESET.tiles.map(({ coordinate, type, tile }) => {
          if (type === TileTypes.LAND) {
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
                hoveredTiles={[]}
                isFlashing={false}
                isBlockedFlashing={false}
                hasRobber={tile.id === HOME_DEMO_BOARD_PRESET.robberTileId}
                canPlaceRobber={false}
                moves={{}}
                themeId={themeId}
              />
            );
          }
          if (type === TileTypes.PORT) {
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
          return null;
        })}
        <div
          ref={placementRoadLayerRef}
          className="absolute inset-0 pointer-events-none z-0"
        />
        <div
          ref={placementLayerRef}
          className="absolute inset-0 pointer-events-none z-30"
        />
        <HomeDemoPieceLayer
          pieceState={pieceState}
          renderMaps={renderMaps}
          playerColorMap={HOME_DEMO_PLAYER_COLORS}
          center={center}
          size={size}
          themeId={themeId}
        />
      </div>
    </div>
  );
}
