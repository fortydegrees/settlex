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

const PIECE_SCALE = 0.8;
const PIECE_OFFSET_X = 0.5;
const PIECE_OFFSET_Y = 0.63;
const DROP_DISTANCE = 0.7;

const DROP_DURATION = 0.22;
const SQUISH_DURATION = 0.08;
const SETTLE_DURATION = 0.18;
const DUST_DURATION = 0.24;

const DUST_SCALE_FROM = 0.2;
const DUST_SCALE_TO = 1.15;

const DUST_GRADIENT =
  "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0) 70%)";

function createDustRing({ size, x, y }) {
  const ring = document.createElement("div");
  ring.style.position = "absolute";
  ring.style.left = `${x - size / 2}px`;
  ring.style.top = `${y - size / 2}px`;
  ring.style.width = `${size}px`;
  ring.style.height = `${size}px`;
  ring.style.borderRadius = "999px";
  ring.style.background = DUST_GRADIENT;
  ring.style.pointerEvents = "none";
  ring.style.zIndex = "1000";
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

function createRoadEl({ size, x, y, transform, color }) {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.width = `${size}px`;
  el.style.height = `${size * 0.2}px`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.transform = transform;
  el.style.backgroundImage = `url('/svgs/road_${color}.svg')`;
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundSize = "contain";
  el.style.pointerEvents = "none";
  el.style.zIndex = "1001";
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

export function createPiecePlacementRunner({
  getLayerEl,
  getLayout,
  getBoardRect,
  getTiles,
  getPlayerColor,
  emitCue
} = {}) {
  return function run(payload) {
    if (typeof document === "undefined") return;
    if (isDocumentHidden()) return;
    if (!payload) return;

    const layerEl = getLayerEl?.();
    const layout = getLayout?.();
    const boardRect = getBoardRect?.();
    const tiles = getTiles?.();

    if (!layerEl || !layout || !boardRect || !Array.isArray(tiles)) return;

    const { containerWidth, size, center } = layout;
    const scale = containerWidth ? boardRect.width / containerWidth : 1;
    const { nodeRenderById, edgeRenderById } = buildRenderMaps(tiles);

    const color = getPlayerColor?.(payload.playerId) ?? "red";
    const dropPx = size * DROP_DISTANCE * scale;

    if (payload.pieceType === "settlement") {
      const placement = resolveNodePlacement({
        nodeId: payload.id,
        nodeRenderById,
        size,
        center
      });
      if (!placement) return;

      const pieceSize = size * PIECE_SCALE * scale;
      const x = boardRect.left + placement.x * scale;
      const y = boardRect.top + placement.y * scale;

      const pieceEl = createSettlementEl({ size: pieceSize, x, y, color });
      const dustEl = createDustRing({ size: pieceSize * 0.9, x, y });

      layerEl.appendChild(dustEl);
      layerEl.appendChild(pieceEl);

      gsap.set(pieceEl, { y: -dropPx, scale: 1.04, opacity: 0 });
      gsap.set(dustEl, { scale: DUST_SCALE_FROM, opacity: 0.5 });

      gsap.timeline({
        onComplete: () => {
          pieceEl.remove();
          dustEl.remove();
        }
      })
        .to(pieceEl, { y: 0, opacity: 1, duration: DROP_DURATION, ease: "power2.in" })
        .add(() => emitCue?.("build:place"))
        .to(dustEl, {
          scale: DUST_SCALE_TO,
          opacity: 0,
          duration: DUST_DURATION,
          ease: "power2.out"
        }, "<")
        .to(pieceEl, {
          scaleX: 1.06,
          scaleY: 0.92,
          duration: SQUISH_DURATION,
          ease: "power2.out"
        }, "<")
        .to(pieceEl, {
          scaleX: 1,
          scaleY: 1,
          duration: SETTLE_DURATION,
          ease: "back.out(1.6)"
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
      const x = boardRect.left + placement.tileX * scale;
      const y = boardRect.top + placement.tileY * scale;
      const dustX = boardRect.left + placement.dustX * scale;
      const dustY = boardRect.top + placement.dustY * scale;

      const roadEl = createRoadEl({
        size: roadSize,
        x,
        y,
        transform: getEdgeTransform(
          placement.direction,
          roadSize
        ),
        color
      });
      const dustEl = createDustRing({ size: roadSize * 0.7, x: dustX, y: dustY });

      layerEl.appendChild(dustEl);
      layerEl.appendChild(roadEl);

      gsap.set(roadEl, { y: -dropPx, scale: 1.03, opacity: 0 });
      gsap.set(dustEl, { scale: DUST_SCALE_FROM, opacity: 0.5 });

      gsap.timeline({
        onComplete: () => {
          roadEl.remove();
          dustEl.remove();
        }
      })
        .to(roadEl, { y: 0, opacity: 1, duration: DROP_DURATION, ease: "power2.in" })
        .add(() => emitCue?.("build:place"))
        .to(dustEl, {
          scale: DUST_SCALE_TO,
          opacity: 0,
          duration: DUST_DURATION,
          ease: "power2.out"
        }, "<")
        .to(roadEl, {
          scaleX: 1.04,
          scaleY: 0.94,
          duration: SQUISH_DURATION,
          ease: "power2.out"
        }, "<")
        .to(roadEl, {
          scaleX: 1,
          scaleY: 1,
          duration: SETTLE_DURATION,
          ease: "back.out(1.4)"
        });
    }
  };
}
