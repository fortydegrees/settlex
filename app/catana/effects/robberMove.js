import { gsap } from "gsap";
import { tilePixelVector } from "../utils/coordinates";
import { isDocumentHidden } from "../utils/visibility";
import {
  getClassicSvgPath,
  getThemedSvgPath,
  handleThemeImageError
} from "../theme/themes";

const ROBBER_SCALE = 1 / 1.5;
const ROBBER_OFFSET_X = 0.6;
const ROBBER_OFFSET_Y = 0.5;
const MOVE_DURATION = 0.62;
const TAKEOFF_DURATION = 0.16;
const LAND_DURATION = 0.16;
const HOLD_DURATION = 0.1;

const SHADOW_GRADIENT =
  "radial-gradient(ellipse at 42% 50%, rgba(15, 23, 42, 0.46) 0%, rgba(15, 23, 42, 0.24) 44%, rgba(15, 23, 42, 0.1) 70%, rgba(15, 23, 42, 0) 100%)";

function shouldReduceMotion() {
  if (typeof window === "undefined") return true;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function shouldSkipForViewer({ payload, viewerPlayerId }) {
  if (payload?.debugReplay) return false;
  if (payload?.forced) return false;
  if (viewerPlayerId == null || payload?.actorId == null) return false;
  return String(viewerPlayerId) === String(payload.actorId);
}

function resolveTileCenter({ tileId, tiles, size, center }) {
  const tileEntry = tiles.find(({ tile }) => String(tile?.id) === String(tileId));
  if (!tileEntry) return null;
  const [centerX, centerY] = center;
  const [x, y] = tilePixelVector(tileEntry.coordinate, size, centerX, centerY);
  return { x, y };
}

function resolveRenderedRobberPosition({ tileId, layerEl, pieceSize }) {
  const robberEl = getRobberStaticEl(tileId);
  if (!robberEl?.getBoundingClientRect || !layerEl?.getBoundingClientRect) {
    return null;
  }

  const robberRect = robberEl.getBoundingClientRect();
  const layerRect = layerEl.getBoundingClientRect();
  const scale = robberRect.width > 0 ? robberRect.width / pieceSize : 1;
  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }

  return {
    x: (robberRect.left - layerRect.left) / scale + pieceSize * ROBBER_OFFSET_X,
    y: (robberRect.top - layerRect.top) / scale + pieceSize * ROBBER_OFFSET_Y
  };
}

function offsetPosition(position, offset) {
  if (!position || !offset) return position;
  return {
    x: position.x + offset.x,
    y: position.y + offset.y
  };
}

function resolveRobberPosition({
  tileId,
  layerEl,
  tiles,
  size,
  center,
  pieceSize,
  fallbackOffset = null
}) {
  const renderedPosition = resolveRenderedRobberPosition({
    tileId,
    layerEl,
    pieceSize
  });
  if (renderedPosition) return renderedPosition;

  return offsetPosition(
    resolveTileCenter({ tileId, tiles, size, center }),
    fallbackOffset
  );
}

function createRobberEl({ size, x, y, themeId }) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.left = `${x - size * ROBBER_OFFSET_X}px`;
  wrapper.style.top = `${y - size * ROBBER_OFFSET_Y}px`;
  wrapper.style.width = `${size}px`;
  wrapper.style.height = `${size}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "45";
  wrapper.style.willChange = "transform";

  const shadow = document.createElement("div");
  shadow.style.position = "absolute";
  shadow.style.left = "62%";
  shadow.style.top = "68%";
  shadow.style.width = "82%";
  shadow.style.height = "30%";
  shadow.style.borderRadius = "999px";
  shadow.style.transform = "translate(-50%, 0) rotate(-8deg) skewX(-7deg)";
  shadow.style.transformOrigin = "50% 50%";
  shadow.style.background = SHADOW_GRADIENT;
  shadow.style.filter = "blur(4px)";
  shadow.style.opacity = "0.82";

  const image = document.createElement("img");
  image.src = getThemedSvgPath(themeId, "icon_robber.svg");
  image.alt = "";
  image.draggable = false;
  image.style.position = "absolute";
  image.style.inset = "0";
  image.style.width = "100%";
  image.style.height = "100%";
  image.style.willChange = "transform";
  image.onerror = (event) =>
    handleThemeImageError(event, getClassicSvgPath("icon_robber.svg"));

  wrapper.appendChild(shadow);
  wrapper.appendChild(image);

  return { wrapper, image, shadow };
}

function getRobberStaticEl(tileId) {
  if (tileId == null || typeof document === "undefined") return null;
  return document.querySelector(`[data-catana-robber-tile-id="${tileId}"]`);
}

function temporarilyHideStaticRobbers(payload) {
  const hidden = [];
  const tileIds = [];
  if (payload?.hideSourceTile) tileIds.push(payload.fromTileId);
  if (payload?.hideDestinationTile !== false) tileIds.push(payload.toTileId);

  tileIds.forEach((tileId) => {
    const el = getRobberStaticEl(tileId);
    if (!el) return;
    hidden.push([el, el.style.visibility]);
    el.style.visibility = "hidden";
  });

  return () => {
    hidden.forEach(([el, previousVisibility]) => {
      el.style.visibility = previousVisibility;
    });
  };
}

export function createRobberMoveRunner({
  getLayerEl,
  getLayout,
  getTiles,
  viewerPlayerId,
  emitCue,
  themeId
} = {}) {
  return function run(payload) {
    if (typeof document === "undefined") return;
    if (isDocumentHidden()) return;
    if (shouldReduceMotion()) return;
    if (payload?.fromTileId == null || payload?.toTileId == null) return;
    if (String(payload.fromTileId) === String(payload.toTileId)) return;
    if (shouldSkipForViewer({ payload, viewerPlayerId })) return;

    window.requestAnimationFrame(() => {
      const layerEl =
        typeof getLayerEl === "function" ? getLayerEl(payload) : getLayerEl;
      const layout = getLayout?.();
      const tiles = getTiles?.();
      if (!layerEl || !layout || !Array.isArray(tiles)) return;

      const { size, center } = layout;
      const pieceSize = size * ROBBER_SCALE;
      const rawFromCenter = resolveTileCenter({
        tileId: payload.fromTileId,
        tiles,
        size,
        center
      });
      const renderedFromCenter = resolveRenderedRobberPosition({
        tileId: payload.fromTileId,
        layerEl,
        pieceSize
      });
      const restingOffset =
        rawFromCenter && renderedFromCenter
          ? {
              x: renderedFromCenter.x - rawFromCenter.x,
              y: renderedFromCenter.y - rawFromCenter.y
            }
          : null;
      const fromCenter = resolveRobberPosition({
        tileId: payload.fromTileId,
        layerEl,
        tiles,
        size,
        center,
        pieceSize,
        fallbackOffset: restingOffset
      });
      const toCenter = resolveRobberPosition({
        tileId: payload.toTileId,
        layerEl,
        tiles,
        size,
        center,
        pieceSize,
        fallbackOffset: restingOffset
      });
      if (!fromCenter || !toCenter) return;

      const liftPx = Math.max(18, size * 0.42);
      const travelX = toCenter.x - fromCenter.x;
      const travelY = toCenter.y - fromCenter.y;
      const lean = travelX < 0 ? -5 : travelX > 0 ? 5 : 0;
      const restoreStaticRobbers = temporarilyHideStaticRobbers(payload);
      const { wrapper, image, shadow } = createRobberEl({
        size: pieceSize,
        x: fromCenter.x,
        y: fromCenter.y,
        themeId
      });

      layerEl.appendChild(wrapper);
      emitCue?.("robber:move");

      gsap.set(image, { transformOrigin: "50% 92%" });
      gsap.set(shadow, { transformOrigin: "50% 50%" });

      gsap
        .timeline({
          onComplete: () => {
            wrapper.remove();
            restoreStaticRobbers();
          },
          onInterrupt: () => {
            wrapper.remove();
            restoreStaticRobbers();
          }
        })
        .to(image, {
          y: -liftPx,
          scale: 1.06,
          rotate: lean,
          duration: TAKEOFF_DURATION,
          ease: "power2.out"
        })
        .to(
          shadow,
          {
            scale: 0.68,
            opacity: 0.34,
            duration: TAKEOFF_DURATION,
            ease: "power2.out"
          },
          "<"
        )
        .to(wrapper, {
          x: travelX,
          y: travelY,
          duration: MOVE_DURATION,
          ease: "power2.inOut"
        })
        .to(
          image,
          {
            y: -Math.max(6, liftPx * 0.18),
            rotate: lean * 0.35,
            duration: MOVE_DURATION,
            ease: "sine.inOut"
          },
          "<"
        )
        .to(
          shadow,
          {
            scale: 0.9,
            opacity: 0.54,
            duration: MOVE_DURATION,
            ease: "sine.inOut"
          },
          "<"
        )
        .to(image, {
          y: 0,
          rotate: 0,
          scaleX: 1.08,
          scaleY: 0.94,
          duration: LAND_DURATION,
          ease: "power2.in"
        })
        .to(
          shadow,
          {
            scale: 1.08,
            opacity: 0.82,
            duration: LAND_DURATION,
            ease: "power2.in"
          },
          "<"
        )
        .to(image, {
          scaleX: 1,
          scaleY: 1,
          duration: 0.18,
          ease: "back.out(2)"
        })
        .to(wrapper, {
          opacity: payload?.debugReplay ? 0 : 1,
          duration: payload?.debugReplay ? HOLD_DURATION : 0.01,
          ease: "power1.out"
        });
    });
  };
}
