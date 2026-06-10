"use client";

import React, { useEffect, useMemo, useState } from "react";
import { buildRenderMaps } from "../../utils/renderMaps";
import { getBoardLayout } from "../../utils/boardLayout";
import {
  getEdgeTransform,
  getNodeDelta,
  SQRT3,
  tilePixelVector
} from "../../utils/coordinates";
import useWindowSize from "../../utils/useWindowSize";
import {
  DEFAULT_THEME_ID,
  getBackgroundImageWithFallback,
  getThemedSvgPath
} from "../../theme/themes";
import { getPieceSvgFile } from "../../theme/pieceAssets";
import {
  PLACE_PIECE_DEFAULT_TUNING,
  getPlacementEffectDuration
} from "../../effects/placePieceDefaults";

const ATTRACT_CYCLE_MS = 11800;
const FINAL_PIECE_REVEAL_MS = Math.max(
  360,
  Math.ceil(getPlacementEffectDuration(PLACE_PIECE_DEFAULT_TUNING) * 1000) - 110
);
const CITY_UPGRADE_START_MS = 7750;
const REDUCED_MOTION_PIECE_IDS = new Set([
  "blue-road-east",
  "blue-settlement",
  "amber-city"
]);

const ATTRACT_PIECES = Object.freeze([
  {
    id: "blue-road-east",
    kind: "road",
    edgeId: "29,32",
    color: "royal",
    playerId: "home-blue",
    startMs: 700,
    finalStartMs: 700 + FINAL_PIECE_REVEAL_MS
  },
  {
    id: "blue-settlement",
    kind: "settlement",
    nodeId: 32,
    color: "royal",
    playerId: "home-blue",
    startMs: 1450,
    finalStartMs: 1450 + FINAL_PIECE_REVEAL_MS
  },
  {
    id: "amber-settlement",
    kind: "settlement",
    nodeId: 31,
    color: "orange",
    playerId: "home-amber",
    startMs: 6000,
    finalStartMs: 6000 + FINAL_PIECE_REVEAL_MS
  },
  {
    id: "amber-city",
    kind: "city",
    nodeId: 31,
    color: "orange",
    playerId: "home-amber",
    startMs: CITY_UPGRADE_START_MS,
    finalStartMs: CITY_UPGRADE_START_MS + FINAL_PIECE_REVEAL_MS
  }
]);

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return reducedMotion;
}

function getNodePosition(renderNode, center, size) {
  const [centerX, centerY] = center;
  const tileWidth = SQRT3 * size;
  const tileHeight = 2 * size;
  const [tileX, tileY] = tilePixelVector(
    renderNode.tile_coordinate,
    size,
    centerX,
    centerY
  );
  const [deltaX, deltaY] = getNodeDelta(
    renderNode.direction,
    tileWidth,
    tileHeight
  );
  return [tileX + deltaX, tileY + deltaY];
}

function AttractPiece({ piece, renderNode, center, size }) {
  const [left, top] = getNodePosition(renderNode, center, size);
  const pieceSize = size * (piece.kind === "city" ? 0.88 : 0.8);
  const pieceTop = top - pieceSize * 0.63;
  const pieceFile = getPieceSvgFile(piece.kind, piece.color);
  const pieceUrl = getThemedSvgPath(DEFAULT_THEME_ID, pieceFile);

  return (
    <div
      data-home-attract-kind={piece.kind}
      data-home-attract-piece={piece.id}
      style={{
        position: "absolute",
        zIndex: 4,
        backgroundImage: `url('${pieceUrl}')`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
        filter: "drop-shadow(0 10px 10px rgba(15, 23, 42, 0.26))",
        pointerEvents: "none",
        width: pieceSize,
        height: pieceSize,
        left: left - pieceSize * 0.5,
        top: pieceTop
      }}
    />
  );
}

function AttractRoad({ piece, renderEdge, center, size }) {
  const [centerX, centerY] = center;
  const [tileX, tileY] = tilePixelVector(
    renderEdge.tile_coordinate,
    size,
    centerX,
    centerY
  );
  const roadFile = getPieceSvgFile("road", piece.color);

  return (
    <div
      data-home-attract-kind={piece.kind}
      data-home-attract-piece={piece.id}
      style={{
        position: "absolute",
        zIndex: 3,
        pointerEvents: "none",
        width: size,
        height: size * 0.2,
        left: tileX,
        top: tileY,
        transform: getEdgeTransform(renderEdge.direction, size)
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundImage: getBackgroundImageWithFallback(DEFAULT_THEME_ID, roadFile),
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          filter: "drop-shadow(0 8px 8px rgba(15, 23, 42, 0.22))"
        }}
      />
    </div>
  );
}

export function HomeTableAttractLoop({ G, reservedHeight, effectsBus }) {
  const { width, height } = useWindowSize();
  const reducedMotion = useReducedMotion();
  const [visiblePieceIds, setVisiblePieceIds] = useState(() => new Set());

  const geometry = useMemo(() => {
    const layout = getBoardLayout({
      width,
      height,
      reservedUiHeight: reservedHeight
    });
    const renderMaps = buildRenderMaps(G?.tiles);
    return { ...layout, ...renderMaps };
  }, [G?.tiles, height, reservedHeight, width]);

  useEffect(() => {
    if (reducedMotion) {
      setVisiblePieceIds(new Set(REDUCED_MOTION_PIECE_IDS));
      return undefined;
    }

    setVisiblePieceIds(new Set());

    if (!effectsBus) {
      return undefined;
    }

    const timers = [];
    let cycleIndex = 0;
    let isActive = true;

    const showPiece = (pieceId) => {
      if (!isActive) return;
      setVisiblePieceIds((current) => {
        if (current.has(pieceId)) return current;
        const next = new Set(current);
        next.add(pieceId);
        return next;
      });
    };

    const hidePiece = (pieceId) => {
      if (!isActive) return;
      setVisiblePieceIds((current) => {
        if (!current.has(pieceId)) return current;
        const next = new Set(current);
        next.delete(pieceId);
        return next;
      });
    };

    const scheduleCycle = () => {
      const activeCycle = cycleIndex;
      cycleIndex += 1;
      setVisiblePieceIds(new Set());

      ATTRACT_PIECES.forEach((piece) => {
        timers.push(
          window.setTimeout(() => {
            effectsBus.emit({
              type: "build:place",
              effectId: `home-table:${activeCycle}:${piece.id}`,
              payload: {
                pieceType: piece.kind,
                id: piece.kind === "road" ? piece.edgeId : piece.nodeId,
                playerId: piece.playerId
              }
            });
          }, piece.startMs)
        );
        timers.push(
          window.setTimeout(() => {
            showPiece(piece.id);
          }, piece.finalStartMs)
        );
      });

      timers.push(
        window.setTimeout(() => {
          hidePiece("amber-settlement");
        }, CITY_UPGRADE_START_MS)
      );
      timers.push(window.setTimeout(scheduleCycle, ATTRACT_CYCLE_MS));
    };

    scheduleCycle();

    return () => {
      isActive = false;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [effectsBus, reducedMotion]);

  if (!width || !height) {
    return null;
  }

  const visiblePieces = ATTRACT_PIECES.filter((piece) =>
    visiblePieceIds.has(piece.id)
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20"
    >
      {visiblePieces.map((piece) => {
        if (piece.kind === "road") {
          const renderEdge = geometry.edgeRenderById[piece.edgeId];
          if (!renderEdge) return null;
          return (
            <AttractRoad
              key={piece.id}
              piece={piece}
              renderEdge={renderEdge}
              center={geometry.center}
              size={geometry.size}
            />
          );
        }

        const renderNode = geometry.nodeRenderById[String(piece.nodeId)];
        if (!renderNode) return null;
        return (
          <AttractPiece
            key={piece.id}
            piece={piece}
            renderNode={renderNode}
            center={geometry.center}
            size={geometry.size}
          />
        );
      })}
    </div>
  );
}
