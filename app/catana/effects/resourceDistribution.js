import { gsap } from "gsap";
import { tilePixelVector } from "../utils/coordinates";
import { isDocumentHidden } from "../utils/visibility";
import {
  getClassicSvgPath,
  getThemedSvgPath,
  handleThemeImageError,
} from "../theme/themes";

const TOKEN_CLASS = "pointer-events-none drop-shadow-lg";
const RESOURCE_CARD_BACK_FILE = "cards/resource/card_rescardback.svg";
const RESOURCE_CARD_SIZE_MULTIPLIER = 0.9;
const RESOURCE_CARD_FILES_BY_RESOURCE = Object.freeze({
  Wood: "cards/resource/card_wood.svg",
  Brick: "cards/resource/card_brick.svg",
  Sheep: "cards/resource/card_sheep.svg",
  Wheat: "cards/resource/card_wheat.svg",
  Ore: "cards/resource/card_ore.svg",
});

const POP_SCALES = {
  from: 0.2,
  overshoot: 1.15,
  settle: 1
};

const POP_DURATIONS = {
  pop: 0.18,
  settle: 0.6
};

const BASE_DELAY = 1;
const POP_STAGGER = 0.1;
const TRAVEL_STAGGER = 0.02;
const TRAVEL_CUE_LEAD = 0.15;

const TRAVEL_DURATION = 0.6;
const JITTER_X = 4;
const JITTER_Y = 6;
const ROTATE_DEG = 3;
const SPECIFIC_RESOURCE_TARGET_Y_OFFSET = 15;

function createCardElement(resource, themeId) {
  const el = document.createElement("div");
  el.className = TOKEN_CLASS;
  el.style.position = "absolute";
  el.style.pointerEvents = "none";

  const img = document.createElement("img");
  const fileName = RESOURCE_CARD_FILES_BY_RESOURCE[resource] ?? RESOURCE_CARD_BACK_FILE;
  img.src = getThemedSvgPath(themeId, fileName);
  img.alt = "";
  img.draggable = false;
  img.style.display = "block";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  img.onerror = (event) =>
    handleThemeImageError(event, getClassicSvgPath(RESOURCE_CARD_BACK_FILE));
  el.appendChild(img);
  return el;
}

export function scheduleResourceCues(timeline, emitCue) {
  if (!timeline || !emitCue) return;
  timeline.call(() => emitCue("resource:pop:start"), null, "pop");
}

export function getDistributionTimings({
  index,
  count,
  baseDelay,
  popStagger,
  travelStagger,
  popDuration,
  travelCueLead = 0
}) {
  const travelStart = baseDelay + popStagger * (count - 1) + popDuration;
  return {
    popStart: baseDelay + popStagger * index,
    travelStart,
    travelStartForCard: travelStart + travelStagger * index,
    travelCueAt: Math.max(0, travelStart - travelCueLead)
  };
}

export function getCardAnimationConfig({
  startX,
  startY,
  endX,
  endY,
  jitterX = 0,
  jitterY = 0,
  rotate = 0,
  scaleMultiplier = 1,
  endScale = 1
}) {
  return {
    from: {
      x: startX + jitterX,
      y: startY + jitterY,
      opacity: 0,
      scale: POP_SCALES.from * scaleMultiplier,
      rotation: rotate
    },
    pop: {
      opacity: 1,
      scale: POP_SCALES.overshoot * scaleMultiplier,
      rotation: rotate,
      duration: POP_DURATIONS.pop,
      ease: "back.out(2)"
    },
    settle: {
      scale: POP_SCALES.settle * scaleMultiplier,
      rotation: 0,
      duration: POP_DURATIONS.settle,
      ease: "power2.out"
    },
    travel: {
      x: endX,
      y: endY,
      scale: endScale,
      duration: TRAVEL_DURATION,
      ease: "power2.out"
    }
  };
}

export function getRandomizedOffsets(random = Math.random) {
  return {
    jitterX: (random() * 2 - 1) * JITTER_X,
    jitterY: (random() * 2 - 1) * JITTER_Y,
    rotate: (random() * 2 - 1) * ROTATE_DEG
  };
}

export function getBoardViewportScale({
  boardRect,
  layoutContainerWidth
} = {}) {
  if (!boardRect) return 1;
  const boardWidth = Number(boardRect.width);
  const containerWidth = Number(layoutContainerWidth);
  if (!Number.isFinite(boardWidth) || boardWidth <= 0) return 1;
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return 1;
  return boardWidth / containerWidth;
}

export function getTileCardStartPosition({
  boardRect,
  tileX,
  tileY,
  size,
  cardWidth,
  scale = 1
}) {
  return {
    startX: boardRect.left + tileX * scale - cardWidth / 2,
    startY: boardRect.top + (tileY - size) * scale
  };
}

export function getCardTravelTargetPosition({
  targetRect,
  cardHeight,
  targetKind = "specific"
} = {}) {
  if (!targetRect) {
    return {
      endX: 0,
      endY: 0
    };
  }

  const endX = targetRect.left;
  if (targetKind === "stack") {
    return {
      endX,
      endY: targetRect.top + (targetRect.height - cardHeight) / 2
    };
  }

  return {
    endX,
    endY: targetRect.top - SPECIFIC_RESOURCE_TARGET_Y_OFFSET
  };
}

export function createResourceDistributionRunner({
  layerEl,
  getLayerEl,
  getLayout,
  getBoardRect,
  emitCue,
  onComplete,
  random = Math.random,
  themeId
} = {}) {
  return function run(payload) {
    let completed = false;
    const notifyComplete = () => {
      if (completed) return;
      completed = true;
      onComplete?.();
    };

    if (typeof document === "undefined") {
      notifyComplete();
      return;
    }
    if (isDocumentHidden()) {
      notifyComplete();
      return;
    }

    const resolvedLayer = getLayerEl ? getLayerEl() : layerEl;
    if (!resolvedLayer || !getLayout || !getBoardRect) {
      notifyComplete();
      return;
    }

    const cards = Array.isArray(payload) ? payload : payload?.cards ?? [];
    if (!cards.length) {
      notifyComplete();
      return;
    }

    const popDuration = POP_DURATIONS.pop + POP_DURATIONS.settle;
    const layout = getLayout();
    if (!layout?.size || !layout?.center) {
      notifyComplete();
      return;
    }
    const { size, center } = layout;
    const boardRect = getBoardRect();
    if (!boardRect) {
      notifyComplete();
      return;
    }
    const scale = getBoardViewportScale({
      boardRect,
      layoutContainerWidth: layout.containerWidth
    });

    let activeAnimations = 0;

    cards.forEach((card, index) => {
      const [centerX, centerY] = center;
      const [tileX, tileY] = tilePixelVector(card.coordinate, size, centerX, centerY);

      const cardWidth = size * 0.5 * RESOURCE_CARD_SIZE_MULTIPLIER;
      const cardHeight = size * 0.7 * RESOURCE_CARD_SIZE_MULTIPLIER;
      const { startX, startY } = getTileCardStartPosition({
        boardRect,
        tileX,
        tileY,
        size,
        cardWidth,
        scale
      });

      const specificId = `p${card.playerID}-${card.resource}`;
      const genericId = `p${card.playerID}-resources`;
      const specificTargetEl = document.getElementById(specificId);
      const genericTargetEl = specificTargetEl
        ? null
        : document.getElementById(genericId);
      const targetEl = specificTargetEl || genericTargetEl;
      if (!targetEl) return;

      const targetRect = targetEl.getBoundingClientRect();
      const { endX, endY } = getCardTravelTargetPosition({
        targetRect,
        cardHeight,
        targetKind: genericTargetEl ? "stack" : "specific"
      });

      const el = createCardElement(card.resource, themeId);
      el.style.width = `${cardWidth}px`;
      el.style.height = `${cardHeight}px`;
      resolvedLayer.appendChild(el);
      activeAnimations += 1;

      const { jitterX, jitterY, rotate } = getRandomizedOffsets(random);
      const anim = getCardAnimationConfig({
        startX,
        startY,
        endX,
        endY,
        jitterX,
        jitterY,
        rotate,
        scaleMultiplier: scale,
        endScale: 1
      });
      const timings = getDistributionTimings({
        index,
        count: cards.length,
        baseDelay: BASE_DELAY,
        popStagger: POP_STAGGER,
        travelStagger: TRAVEL_STAGGER,
        popDuration,
        travelCueLead: TRAVEL_CUE_LEAD
      });

      gsap.set(el, anim.from);

      const tl = gsap.timeline({
        onComplete: () => {
          el.remove();
        }
      });

      tl.addLabel("pop", timings.popStart)
        .to(el, anim.pop, "pop")
        .to(el, anim.settle)
        .addLabel("travel", timings.travelStartForCard)
        .to(el, anim.travel, "travel");

      scheduleResourceCues(tl, emitCue);
      if (emitCue && index === 0) {
        tl.call(() => emitCue("resource:travel:start"), null, timings.travelCueAt);
      }

      tl.call(() => {
        activeAnimations -= 1;
        if (activeAnimations <= 0) {
          notifyComplete();
        }
      }, null, timings.travelStartForCard + TRAVEL_DURATION);
    });

    if (activeAnimations === 0) {
      notifyComplete();
    }
  };
}
