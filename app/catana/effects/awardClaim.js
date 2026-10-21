import { gsap } from "gsap";
import { isDocumentHidden } from "../utils/visibility";
import { getPlayerNameHex } from "../theme/playerColors";

const LONGEST_ROAD_ICON_SRC = "/svgs/icon_longest_road.svg";
const LARGEST_ARMY_ICON_SRC = "/svgs/icon_largest_army.svg";
const TOKEN_SIZE = 58;
const ROAD_GLOW_IN_DURATION = 0.52;
const ROAD_GLOW_HOLD_DURATION = 0.34;
const ROAD_GLOW_OUT_DURATION = 0.72;
const ROAD_STAGGER = 0.045;
const TOKEN_HOLD_DURATION = 0.5;
const TOKEN_POP_SCALE = 1.5;
const TOKEN_HOLD_SCALE = 1.42;
const AWARD_CONFIG_BY_TYPE = Object.freeze({
  longestRoad: {
    iconSrc: LONGEST_ROAD_ICON_SRC,
    targetSuffix: "longest-road",
    cueName: "award:longest-road",
    glowRoads: true
  },
  largestArmy: {
    iconSrc: LARGEST_ARMY_ICON_SRC,
    targetSuffix: "largest-army",
    cueName: "award:largest-army",
    glowRoads: false
  }
});

function shouldReduceMotion() {
  if (typeof window === "undefined") return true;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getCenterPosition(rect, width = TOKEN_SIZE, height = TOKEN_SIZE) {
  return {
    x: rect.left + rect.width / 2 - width / 2,
    y: rect.top + rect.height / 2 - height / 2
  };
}

function hexToRgb(hex) {
  const value = String(hex ?? "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const intValue = Number.parseInt(value, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255
  };
}

function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(250,204,21,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function getRoadGlowFilter(color, intensity = 1) {
  const primaryAlpha = Math.max(0, Math.min(1, 0.84 * intensity));
  const secondaryAlpha = Math.max(0, Math.min(1, 0.38 * intensity));
  const brightness = 1 + 0.24 * intensity;
  const saturation = 1 + 0.28 * intensity;
  return [
    `drop-shadow(0 0 13px ${rgbaFromHex(color, primaryAlpha)})`,
    `drop-shadow(0 0 22px rgba(250,204,21,${secondaryAlpha}))`,
    `brightness(${brightness})`,
    `saturate(${saturation})`
  ].join(" ");
}

function createAwardToken({ color, iconSrc }) {
  const token = document.createElement("div");
  token.style.position = "absolute";
  token.style.width = `${TOKEN_SIZE}px`;
  token.style.height = `${TOKEN_SIZE}px`;
  token.style.borderRadius = "18px";
  token.style.pointerEvents = "none";
  token.style.background =
    "radial-gradient(circle at 35% 24%, rgba(255,255,255,0.94) 0%, rgba(254,243,199,0.98) 38%, rgba(245,158,11,0.92) 72%, rgba(180,83,9,0.9) 100%)";
  token.style.border = "1px solid rgba(255,247,237,0.92)";
  token.style.boxShadow =
    "0 24px 42px rgba(15,23,42,0.28), 0 0 24px rgba(250,204,21,0.36), inset 0 2px 0 rgba(255,255,255,0.74), inset 0 -5px 10px rgba(146,64,14,0.2)";
  token.style.display = "flex";
  token.style.alignItems = "center";
  token.style.justifyContent = "center";
  token.style.zIndex = "1010";

  const glow = document.createElement("div");
  glow.style.position = "absolute";
  glow.style.inset = "5px";
  glow.style.borderRadius = "14px";
  glow.style.background =
    `radial-gradient(circle, ${rgbaFromHex(color, 0.34)} 0%, rgba(250,204,21,0.22) 48%, rgba(180,83,9,0) 72%)`;
  glow.style.opacity = "0.82";
  glow.style.filter = "blur(7px)";

  const rim = document.createElement("div");
  rim.style.position = "absolute";
  rim.style.inset = "4px";
  rim.style.borderRadius = "14px";
  rim.style.border = "1px solid rgba(255,255,255,0.6)";
  rim.style.boxShadow =
    "inset 0 0 0 1px rgba(120,53,15,0.12), inset 0 0 14px rgba(255,247,237,0.34)";

  const img = document.createElement("img");
  img.src = iconSrc;
  img.alt = "";
  img.draggable = false;
  img.style.position = "relative";
  img.style.width = "39px";
  img.style.height = "39px";
  img.style.objectFit = "contain";
  img.style.filter =
    "drop-shadow(0 2px 2px rgba(15,23,42,0.28)) drop-shadow(0 0 9px rgba(255,247,237,0.68))";

  token.appendChild(glow);
  token.appendChild(rim);
  token.appendChild(img);
  return token;
}

function averagePositions(positions) {
  if (!positions.length) return null;
  const sum = positions.reduce(
    (acc, position) => ({
      x: acc.x + position.x,
      y: acc.y + position.y
    }),
    { x: 0, y: 0 }
  );
  return {
    x: sum.x / positions.length,
    y: sum.y / positions.length
  };
}

function getRoadElement(edgeId) {
  if (edgeId == null || typeof document === "undefined") return null;
  return document.getElementById(String(edgeId));
}

function getRoadCenter(roadEl) {
  const rect = roadEl?.getBoundingClientRect?.();
  if (!rect) return null;
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function getAwardHudPosition(playerId, targetSuffix) {
  if (!playerId) return null;
  const anchorEl = document.getElementById(`p${playerId}-${targetSuffix}`);
  const rect = anchorEl?.getBoundingClientRect?.() ?? null;
  return rect ? getCenterPosition(rect) : null;
}

function getRenderedRobberPosition() {
  const robberEl = document.querySelector("[data-catana-robber-tile-id]");
  const rect = robberEl?.getBoundingClientRect?.() ?? null;
  return rect ? getCenterPosition(rect) : null;
}

function snapshotRoadStyles(roadEls) {
  return roadEls.map((el) => ({
    el,
    filter: el.style.filter,
    willChange: el.style.willChange
  }));
}

function restoreRoadStyles(styleSnapshots) {
  styleSnapshots.forEach(
    ({ el, filter, willChange }) => {
      el.style.filter = filter;
      el.style.willChange = willChange;
    }
  );
}

function runTokenTimeline({ timeline, token, target, start }) {
  if (!token || !target || !start) return;
  timeline
    .fromTo(
      token,
      { opacity: 0, scale: 0.72, y: -10 },
      {
        opacity: 1,
        scale: TOKEN_POP_SCALE,
        y: 0,
        duration: 0.28,
        ease: "back.out(2)"
      },
      ">+0.06"
  )
  .to(token, {
      scale: TOKEN_HOLD_SCALE,
      duration: TOKEN_HOLD_DURATION,
      ease: "sine.inOut"
    })
    .to(token, {
      x: target.x - start.x,
      y: target.y - start.y,
      scale: 0.68,
      duration: 0.62,
      ease: "power2.inOut"
    })
    .to(token, {
      scale: 0.62,
      opacity: 0,
      duration: 0.18,
      ease: "power1.out"
    });
}

export function createAwardClaimRunner({
  getLayerEl,
  getRoadsByEdgeId,
  getPlayerColor,
  getTargetEl,
  emitCue
} = {}) {
  return function run(payload) {
    if (typeof document === "undefined") return;
    if (isDocumentHidden()) return;
    if (shouldReduceMotion()) return;
    const awardConfig = AWARD_CONFIG_BY_TYPE[payload?.awardType];
    if (!awardConfig) return;
    if (!payload?.playerId) return;

    window.requestAnimationFrame(() => {
      const layerEl =
        typeof getLayerEl === "function" ? getLayerEl(payload) : getLayerEl;
      if (!layerEl) return;

      const colorId = payload.playerColorId ?? getPlayerColor?.(payload.playerId);
      const color = getPlayerNameHex(colorId) ?? "#facc15";

      const roadOwnerMap = getRoadsByEdgeId?.() ?? {};
      const roadIds =
        payload.roadIds?.length > 0
          ? payload.roadIds
          : Object.entries(roadOwnerMap)
              .filter(([, ownerId]) => String(ownerId) === String(payload.playerId))
              .map(([edgeId]) => edgeId);
      const roadEls = awardConfig.glowRoads
        ? roadIds.map(getRoadElement).filter(Boolean)
        : [];
      if (awardConfig.glowRoads && roadEls.length === 0) return;
      const roadStyleSnapshots = snapshotRoadStyles(roadEls);
      const roadCenters = roadEls.map(getRoadCenter).filter(Boolean);

      const targetId = `p${payload.playerId}-${awardConfig.targetSuffix}`;
      const targetEl =
        getTargetEl?.(payload, targetId) ?? document.getElementById(targetId);
      const targetRect = targetEl?.getBoundingClientRect?.() ?? null;
      const target = targetRect ? getCenterPosition(targetRect) : null;
      const roadCenter = averagePositions(roadCenters);
      const previousOwnerStart = getAwardHudPosition(
        payload.previousOwnerId,
        awardConfig.targetSuffix
      );
      const robberStart =
        payload.awardType === "largestArmy" && !previousOwnerStart
          ? getRenderedRobberPosition()
          : null;
      const roadStart = roadCenter
        ? {
            x: roadCenter.x - TOKEN_SIZE / 2,
            y: roadCenter.y - TOKEN_SIZE / 2
          }
        : null;
      const start = previousOwnerStart ?? robberStart ?? roadStart ?? target;

      const token =
        target && start
          ? createAwardToken({ color, iconSrc: awardConfig.iconSrc })
          : null;
      if (token) {
        token.style.left = `${start.x}px`;
        token.style.top = `${start.y}px`;
        token.style.opacity = "0";
        layerEl.appendChild(token);
      }

      emitCue?.(awardConfig.cueName);

      const timeline = gsap.timeline({
        onComplete: () => {
          restoreRoadStyles(roadStyleSnapshots);
          token?.remove();
        },
        onInterrupt: () => {
          restoreRoadStyles(roadStyleSnapshots);
          token?.remove();
        }
      });

      if (awardConfig.glowRoads) {
        timeline
          .set(roadEls, {
            willChange: "filter"
          })
          .to(roadEls, {
            filter: getRoadGlowFilter(color, 0.82),
            duration: ROAD_GLOW_IN_DURATION,
            stagger: ROAD_STAGGER,
            ease: "power2.out"
          })
          .to(roadEls, {
            filter: getRoadGlowFilter(color, 1),
            duration: ROAD_GLOW_HOLD_DURATION,
            stagger: ROAD_STAGGER * 0.4,
            ease: "sine.inOut"
          })
          .to(
            roadEls,
            {
              filter: getRoadGlowFilter(color, 0),
              duration: ROAD_GLOW_OUT_DURATION,
              stagger: ROAD_STAGGER * 0.7,
              ease: "sine.out"
            },
            ">-0.04"
          );
      }

      runTokenTimeline({ timeline, token, target, start });
    });
  };
}
