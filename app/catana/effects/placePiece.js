import { gsap } from "gsap";
import { buildRenderMaps } from "../utils/renderMaps";
import {
  getEdgeDelta,
  getEdgeTransform,
  getNodeDelta,
  SQRT3,
  tilePixelVector
} from "../utils/coordinates";
import { isDocumentHidden } from "../utils/visibility";
import { PLACE_PIECE_DEFAULT_TUNING } from "./placePieceDefaults";

const PIECE_SCALE = 0.8;
const PIECE_OFFSET_X = 0.5;
const PIECE_OFFSET_Y = 0.63;

const SHADOW_GRADIENT =
  "radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0) 70%)";

const DUST_GRADIENT =
  "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0) 70%)";

function createRing({ size, x, y, gradient, zIndex }) {
  const ring = document.createElement("div");
  ring.style.position = "absolute";
  ring.style.left = `${x - size / 2}px`;
  ring.style.top = `${y - size / 2}px`;
  ring.style.width = `${size}px`;
  ring.style.height = `${size}px`;
  ring.style.borderRadius = "999px";
  ring.style.background = gradient;
  ring.style.pointerEvents = "none";
  ring.style.zIndex = `${zIndex ?? 1000}`;
  return ring;
}

function createSettlementEl({ size, x, y, color }) {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.left = `${x - size * PIECE_OFFSET_X}px`;
  el.style.top = `${y - size * PIECE_OFFSET_Y}px`;
  el.style.backgroundImage = `url('/svgs/settlement_${color}.svg')`;
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundSize = "cover";
  el.style.pointerEvents = "none";
  el.style.zIndex = "1001";
  return el;
}

function createCityEl({ size, x, y, color }) {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.left = `${x - size * PIECE_OFFSET_X}px`;
  el.style.top = `${y - size * PIECE_OFFSET_Y}px`;
  el.style.backgroundImage = `url('/svgs/city_${color}.svg')`;
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundSize = "cover";
  el.style.pointerEvents = "none";
  el.style.zIndex = "1001";
  return el;
}

function createRoadWrapper({ size, x, y }) {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.pointerEvents = "none";
  el.style.zIndex = "1001";
  return el;
}

function createRoadInner({ size, transform, color }) {
  const el = document.createElement("div");
  el.style.width = `${size}px`;
  el.style.height = `${size * 0.2}px`;
  el.style.transform = transform;
  el.style.backgroundImage = `url('/svgs/road_${color}.svg')`;
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundSize = "contain";
  el.style.pointerEvents = "none";
  return el;
}

function resolveNodePlacement({ nodeId, nodeRenderById, size, center }) {
  const renderNode = nodeRenderById[String(nodeId)];
  if (!renderNode) return null;
  const [centerX, centerY] = center;
  const w = SQRT3 * size;
  const h = 2 * size;
  const [tileX, tileY] = tilePixelVector(renderNode.tile_coordinate, size, centerX, centerY);
  const [deltaX, deltaY] = getNodeDelta(renderNode.direction, w, h);
  return {
    x: tileX + deltaX,
    y: tileY + deltaY
  };
}

function resolveEdgePlacement({ edgeId, edgeRenderById, size, center }) {
  const renderEdge = edgeRenderById[edgeId];
  if (!renderEdge) return null;
  const [centerX, centerY] = center;
  const w = SQRT3 * size;
  const h = 2 * size;
  const [tileX, tileY] = tilePixelVector(renderEdge.tile_coordinate, size, centerX, centerY);
  const [deltaX, deltaY] = getEdgeDelta(renderEdge.direction, w, h);
  return {
    tileX,
    tileY,
    dustX: tileX + deltaX,
    dustY: tileY + deltaY,
    direction: renderEdge.direction
  };
}

function runNodePlacementAnimation({
  pieceEl,
  shadowEl,
  dustEl,
  tuning,
  dropPx,
  emitCue,
  cueName
}) {
  gsap.set(pieceEl, { y: -dropPx, scale: 1.04, opacity: 0 });
  gsap.set(shadowEl, { scale: tuning.shadowScaleFrom, opacity: 0 });
  gsap.set(dustEl, { scale: tuning.dustScaleFrom, opacity: 0 });

  gsap.timeline({
    onComplete: () => {
      pieceEl.remove();
      dustEl.remove();
      shadowEl.remove();
    }
  })
    .to(pieceEl, {
      y: 0,
      opacity: 1,
      duration: tuning.dropDuration,
      ease: tuning.easeDrop
    })
    .to(
      shadowEl,
      {
        scale: tuning.shadowScaleTo,
        opacity: tuning.shadowOpacity,
        duration: tuning.dropDuration,
        ease: tuning.shadowEase
      },
      "<"
    )
    .add(() => emitCue?.(cueName))
    .fromTo(
      dustEl,
      { scale: tuning.dustScaleFrom, opacity: tuning.dustOpacity },
      {
        scale: tuning.dustScaleTo,
        opacity: 0,
        duration: tuning.dustDuration,
        ease: tuning.easeDust
      },
      "<"
    )
    .to(
      shadowEl,
      {
        opacity: 0,
        duration: tuning.shadowFadeOutDuration,
        ease: "power1.out"
      },
      "<"
    )
    .to(
      pieceEl,
      {
        scaleX: tuning.squishScaleX,
        scaleY: tuning.squishScaleY,
        duration: tuning.squishDuration,
        ease: tuning.easeSquish
      },
      "<"
    )
    .to(pieceEl, {
      scaleX: 1,
      scaleY: 1,
      duration: tuning.settleDuration,
      ease: tuning.easeSettle
    })
    .to(pieceEl, {
      opacity: 1,
      duration: tuning.postHoldDuration,
      ease: "none"
    });
}

export function createPiecePlacementRunner({
  getLayerEl,
  getLayout,
  getBoardRect,
  getTiles,
  getPlayerColor,
  emitCue,
  useBoardSpace = false
} = {}) {
  return function run(payload) {
    if (typeof document === "undefined") return;
    if (isDocumentHidden()) return;
    if (!payload) return;

    const layerEl =
      typeof getLayerEl === "function" ? getLayerEl(payload) : getLayerEl;
    const layout = getLayout?.();
    const boardRect = getBoardRect?.();
    const tiles = getTiles?.();

    if (!layerEl || !layout || !Array.isArray(tiles)) return;
    if (!useBoardSpace && !boardRect) return;

    const { containerWidth, size, center } = layout;
    const scale = useBoardSpace
      ? 1
      : containerWidth
        ? boardRect.width / containerWidth
        : 1;
    const offsetLeft = useBoardSpace ? 0 : boardRect.left;
    const offsetTop = useBoardSpace ? 0 : boardRect.top;
    const { nodeRenderById, edgeRenderById } = buildRenderMaps(tiles);
    const tuning = {
      ...PLACE_PIECE_DEFAULT_TUNING,
      ...(payload?.tuning ?? {})
    };

    const color = getPlayerColor?.(payload.playerId) ?? "red";
    const dropPx = size * tuning.dropDistance * scale;

    if (payload.pieceType === "settlement") {
      const placement = resolveNodePlacement({
        nodeId: payload.id,
        nodeRenderById,
        size,
        center
      });
      if (!placement) return;

      const pieceSize = size * PIECE_SCALE * scale;
      const x = offsetLeft + placement.x * scale;
      const y = offsetTop + placement.y * scale;

      const pieceEl = createSettlementEl({ size: pieceSize, x, y, color });
      const shadowEl = createRing({
        size: pieceSize * tuning.shadowSizeSettlement,
        x,
        y,
        gradient: SHADOW_GRADIENT,
        zIndex: 999
      });
      const dustEl = createRing({
        size: pieceSize * tuning.dustSizeSettlement,
        x,
        y,
        gradient: DUST_GRADIENT,
        zIndex: 1000
      });

      layerEl.appendChild(shadowEl);
      layerEl.appendChild(dustEl);
      layerEl.appendChild(pieceEl);

      runNodePlacementAnimation({
        pieceEl,
        shadowEl,
        dustEl,
        tuning,
        dropPx,
        emitCue,
        cueName: "build:settlement"
      });
      return;
    }

    if (payload.pieceType === "city") {
      const placement = resolveNodePlacement({
        nodeId: payload.id,
        nodeRenderById,
        size,
        center
      });
      if (!placement) return;

      const pieceSize = size * PIECE_SCALE * scale;
      const x = offsetLeft + placement.x * scale;
      const y = offsetTop + placement.y * scale;

      const pieceEl = createCityEl({ size: pieceSize, x, y, color });
      const shadowEl = createRing({
        size: pieceSize * tuning.shadowSizeSettlement,
        x,
        y,
        gradient: SHADOW_GRADIENT,
        zIndex: 999
      });
      const dustEl = createRing({
        size: pieceSize * tuning.dustSizeSettlement,
        x,
        y,
        gradient: DUST_GRADIENT,
        zIndex: 1000
      });

      layerEl.appendChild(shadowEl);
      layerEl.appendChild(dustEl);
      layerEl.appendChild(pieceEl);

      runNodePlacementAnimation({
        pieceEl,
        shadowEl,
        dustEl,
        tuning,
        dropPx,
        emitCue,
        cueName: "build:city"
      });
      return;
    }

    if (payload.pieceType === "road") {
      const placement = resolveEdgePlacement({
        edgeId: payload.id,
        edgeRenderById,
        size,
        center
      });
      if (!placement) return;

      const roadSize = size * scale;
      const x = offsetLeft + placement.tileX * scale;
      const y = offsetTop + placement.tileY * scale;
      const dustX = offsetLeft + placement.dustX * scale;
      const dustY = offsetTop + placement.dustY * scale;

      const roadWrapperEl = createRoadWrapper({
        size: roadSize,
        x,
        y
      });
      const roadInnerEl = createRoadInner({
        size: roadSize,
        transform: getEdgeTransform(
          placement.direction,
          roadSize
        ),
        color
      });
      const shadowEl = createRing({
        size: roadSize * tuning.shadowSizeRoad,
        x: dustX,
        y: dustY,
        gradient: SHADOW_GRADIENT,
        zIndex: 999
      });
      const dustEl = createRing({
        size: roadSize * tuning.dustSizeRoad,
        x: dustX,
        y: dustY,
        gradient: DUST_GRADIENT,
        zIndex: 1000
      });

      roadWrapperEl.appendChild(roadInnerEl);
      layerEl.appendChild(shadowEl);
      layerEl.appendChild(dustEl);
      layerEl.appendChild(roadWrapperEl);

      gsap.set(roadWrapperEl, { y: -dropPx, scale: 1.03, opacity: 0 });
      gsap.set(shadowEl, { scale: tuning.shadowScaleFrom, opacity: 0 });
      gsap.set(dustEl, { scale: tuning.dustScaleFrom, opacity: 0 });

      gsap.timeline({
        onComplete: () => {
          roadWrapperEl.remove();
          dustEl.remove();
          shadowEl.remove();
        }
      })
        .to(roadWrapperEl, {
          y: 0,
          opacity: 1,
          duration: tuning.dropDuration,
          ease: tuning.easeDrop
        })
        .to(shadowEl, {
          scale: tuning.shadowScaleTo,
          opacity: tuning.shadowOpacity,
          duration: tuning.dropDuration,
          ease: tuning.shadowEase
        }, "<")
        .add(() => emitCue?.("build:road"))
        .fromTo(
          dustEl,
          { scale: tuning.dustScaleFrom, opacity: tuning.dustOpacity },
          {
            scale: tuning.dustScaleTo,
            opacity: 0,
            duration: tuning.dustDuration,
            ease: tuning.easeDust
          },
          "<"
        )
        .to(shadowEl, {
          opacity: 0,
          duration: tuning.shadowFadeOutDuration,
          ease: "power1.out"
        }, "<")
        .to(roadWrapperEl, {
          scaleX: tuning.roadSquishScaleX,
          scaleY: tuning.roadSquishScaleY,
          duration: tuning.squishDuration,
          ease: tuning.easeSquish
        }, "<")
        .to(roadWrapperEl, {
          scaleX: 1,
          scaleY: 1,
          duration: tuning.settleDuration,
          ease: tuning.easeSettleRoad
        })
        .to(roadWrapperEl, {
          opacity: 1,
          duration: tuning.postHoldDuration,
          ease: "none"
        });
    }
  };
}
