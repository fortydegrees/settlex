import { gsap } from "gsap";
import { isDocumentHidden } from "../utils/visibility";
import {
  getClassicSvgPath,
  getThemedSvgPath,
  handleThemeImageError
} from "../theme/themes";

const DEV_CARD_FACE_SVGS = Object.freeze({
  knight: "/svgs/cards/development/knight.svg",
  roadBuilding: "/svgs/cards/development/roadbuilding.svg",
  yearOfPlenty: "/svgs/cards/development/year_of_plenty.svg",
  monopoly: "/svgs/cards/development/monopoly.svg"
});
const DEV_CARD_BACK_SRC = "/svgs/cards/development/card_devcardback.svg";
const RESOURCE_CARD_BACK_FILE = "cards/resource/card_rescardback.svg";
const RESOURCE_CARD_FILES_BY_RESOURCE = Object.freeze({
  Wood: "cards/resource/card_wood.svg",
  Brick: "cards/resource/card_brick.svg",
  Sheep: "cards/resource/card_sheep.svg",
  Wheat: "cards/resource/card_wheat.svg",
  Ore: "cards/resource/card_ore.svg"
});
const CARD_WIDTH = 52;
const CARD_HEIGHT = 72;
const RESOURCE_CARD_WIDTH = 44;
const RESOURCE_CARD_HEIGHT = 62;
const CARD_CLASS = "pointer-events-none drop-shadow-xl";
const RESOURCE_CARD_CLASS = "pointer-events-none drop-shadow-lg";
const PLAYED_SCALE_BY_PERSPECTIVE = Object.freeze({
  local: 2,
  opponent: 2,
  spectator: 2
});
const FLOAT_SHADOW =
  "drop-shadow(0 22px 28px rgba(15, 23, 42, 0.42)) drop-shadow(0 8px 10px rgba(15, 23, 42, 0.32))";
const LOCAL_PLAYED_OFFSET = Object.freeze({ x: 0, y: -28 });
const OPPONENT_REVEAL_PAUSE = 0.3;
const OPPONENT_FLIP_DURATION = 0.42;
const START_POP_DURATION = 0.32;
const START_SETTLE_DURATION = 0.18;
const RESOURCE_FLOW_DELAY = 0.18;
const RESOURCE_FLOW_FADE_DURATION = 0.08;
const YOP_RESOURCE_HOLD_DURATION = 0.62;
const RESOURCE_FLOW_DEFAULT_CONFIG = Object.freeze({
  stagger: 0.06,
  popFromScale: 0.72,
  popScale: 1,
  travelScale: 0.76,
  popDuration: 0.1,
  holdDuration: 0,
  travelDuration: 0.44,
  hoverSpreadX: 0,
  hoverOffsetY: 0,
  simultaneousTravel: false
});
const RESOURCE_FLOW_CONFIG_BY_CARD = Object.freeze({
  yearOfPlenty: {
    stagger: 0.4,
    popFromScale: 0.2,
    popScale: 1.16,
    travelScale: 0.9,
    popDuration: 0.18,
    holdDuration: YOP_RESOURCE_HOLD_DURATION,
    travelDuration: 0.5,
    hoverSpreadX: 52,
    hoverOffsetY: -8,
    simultaneousTravel: true
  }
});
const MONOPOLY_SELECTION_PREVIEW_CONFIG = Object.freeze({
  popFromScale: 0.2,
  popScale: 1.16,
  popDuration: 0.18,
  holdDuration: YOP_RESOURCE_HOLD_DURATION,
  lingerDuration: 1,
  hoverOffsetY: -8
});

const getCenterPosition = (rect, width = CARD_WIDTH, height = CARD_HEIGHT) => ({
  x: rect.left + rect.width / 2 - width / 2,
  y: rect.top + rect.height / 2 - height / 2
});

const getDevCardFaceSrc = (cardType) =>
  DEV_CARD_FACE_SVGS[cardType] ?? DEV_CARD_BACK_SRC;

const createDevCardElement = (cardType) => {
  const el = document.createElement("div");
  el.className = CARD_CLASS;
  el.style.position = "absolute";
  el.style.pointerEvents = "none";
  el.style.width = `${CARD_WIDTH}px`;
  el.style.height = `${CARD_HEIGHT}px`;
  el.style.transformStyle = "preserve-3d";
  el.style.filter = FLOAT_SHADOW;

  const img = document.createElement("img");
  img.src = getDevCardFaceSrc(cardType);
  img.alt = "";
  img.draggable = false;
  img.style.display = "block";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  el.appendChild(img);
  return el;
};

const createResourceCardElement = (resource, themeId) => {
  const el = document.createElement("div");
  el.className = RESOURCE_CARD_CLASS;
  el.style.position = "absolute";
  el.style.pointerEvents = "none";
  el.style.width = `${RESOURCE_CARD_WIDTH}px`;
  el.style.height = `${RESOURCE_CARD_HEIGHT}px`;

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
};

const getResourceEndpointEl = ({ playerId, resource, getSourceEl, payload }) => {
  const specificId = `p${playerId}-${resource}`;
  const genericId = `p${playerId}-resources`;
  return (
    getSourceEl?.(payload, specificId) ??
    document.getElementById(specificId) ??
    getSourceEl?.(payload, genericId) ??
    document.getElementById(genericId)
  );
};

const getActorCenter = (el) => {
  const rect = el?.getBoundingClientRect?.();
  return rect ? getCenterPosition(rect, RESOURCE_CARD_WIDTH, RESOURCE_CARD_HEIGHT) : null;
};

const getResourceFlowCards = (payload) => {
  if (payload.cardType === "yearOfPlenty") {
    return (payload.resources ?? []).map((resource) => ({
      resource,
      fromPlayerId: null,
      toPlayerId: payload.playerId
    }));
  }
  if (payload.cardType === "monopoly") {
    return (payload.transfers ?? []).flatMap((transfer) =>
      Array.from({ length: transfer.count }, () => ({
        resource: transfer.resource,
        fromPlayerId: transfer.fromPlayerId,
        toPlayerId: transfer.toPlayerId
      }))
    );
  }
  return [];
};

const getHoverPosition = ({ start, index, count, config }) => ({
  x: start.x + (index - (count - 1) / 2) * config.hoverSpreadX,
  y: start.y + config.hoverOffsetY
});

const runSpentCardExit = ({ el, payload, delay = 0, completeResolve }) => {
  gsap
    .timeline({
      delay,
      onComplete: () => completeResolve(payload)
    })
    .to(el, {
      y: "-=26",
      scale: 0.32,
      opacity: 0,
      duration: 0.38,
      ease: "power2.inOut"
    });
};

const runMonopolySelectionPreview = ({
  payload,
  actorEl,
  layer,
  themeId,
  emitCue
}) => {
  if (payload.cardType !== "monopoly" || !payload.resource) return 0;
  const start = getActorCenter(actorEl);
  if (!start) return 0;
  const hover = {
    x: start.x,
    y: start.y + MONOPOLY_SELECTION_PREVIEW_CONFIG.hoverOffsetY
  };

  const el = createResourceCardElement(payload.resource, themeId);
  layer.appendChild(el);
  gsap.set(el, {
    x: start.x,
    y: start.y,
    opacity: 0,
    scale: MONOPOLY_SELECTION_PREVIEW_CONFIG.popFromScale,
    rotation: -2
  });
  gsap
    .timeline({
      delay: RESOURCE_FLOW_DELAY,
      onComplete: () => el.remove()
    })
    .call(() => emitCue?.("resource:pop:start"))
    .to(el, {
      x: hover.x,
      y: hover.y,
      opacity: 1,
      scale: MONOPOLY_SELECTION_PREVIEW_CONFIG.popScale,
      duration: MONOPOLY_SELECTION_PREVIEW_CONFIG.popDuration,
      ease: "back.out(2)"
    })
    .to(el, {
      scale: 1,
      duration:
        MONOPOLY_SELECTION_PREVIEW_CONFIG.holdDuration +
        MONOPOLY_SELECTION_PREVIEW_CONFIG.lingerDuration,
      ease: "power2.out"
    })
    .to(el, {
      opacity: 0,
      duration: RESOURCE_FLOW_FADE_DURATION,
      ease: "power1.out"
    });

  return (
    RESOURCE_FLOW_DELAY +
    MONOPOLY_SELECTION_PREVIEW_CONFIG.popDuration +
    MONOPOLY_SELECTION_PREVIEW_CONFIG.holdDuration +
    RESOURCE_FLOW_FADE_DURATION
  );
};

const runDevCardResourceFlow = ({
  payload,
  actorEl,
  layer,
  getSourceEl,
  themeId,
  emitCue,
  delayOffset = 0
}) => {
  const flowCards = getResourceFlowCards(payload);
  if (flowCards.length === 0) return 0;
  const neutralStart = getActorCenter(actorEl);
  const config =
    RESOURCE_FLOW_CONFIG_BY_CARD[payload.cardType] ?? RESOURCE_FLOW_DEFAULT_CONFIG;
  const finalPopStart = config.stagger * Math.max(0, flowCards.length - 1);
  let animatedCount = 0;

  flowCards.forEach((card, index) => {
    const sourceEl = card.fromPlayerId
      ? getResourceEndpointEl({
          playerId: card.fromPlayerId,
          resource: card.resource,
          getSourceEl,
          payload
        })
      : null;
    const targetEl = getResourceEndpointEl({
      playerId: card.toPlayerId,
      resource: card.resource,
      getSourceEl,
      payload
    });
    const start = getActorCenter(sourceEl) ?? neutralStart;
    const end = getActorCenter(targetEl);
    if (!start || !end) return;
    const hover = getHoverPosition({
      start,
      index,
      count: flowCards.length,
      config
    });
    const holdDuration = config.simultaneousTravel
      ? config.holdDuration + Math.max(0, finalPopStart - index * config.stagger)
      : config.holdDuration;

    const el = createResourceCardElement(card.resource, themeId);
    layer.appendChild(el);
    animatedCount += 1;
    gsap.set(el, {
      x: start.x,
      y: start.y,
      opacity: 0,
      scale: config.popFromScale,
      rotation: index % 2 === 0 ? -2 : 2
    });
    gsap
      .timeline({
        delay: delayOffset + RESOURCE_FLOW_DELAY + index * config.stagger,
        onComplete: () => el.remove()
      })
      .call(() =>
        emitCue?.(
          payload.cardType === "monopoly"
            ? "resource:travel:start"
            : "resource:pop:start"
        )
      )
      .to(el, {
        x: hover.x,
        y: hover.y,
        opacity: 1,
        scale: config.popScale,
        duration: config.popDuration,
        ease: "back.out(2)"
      })
      .to(el, {
        scale: 1,
        duration: holdDuration,
        ease: "power2.out"
      })
      .call(() => {
        if (payload.cardType === "yearOfPlenty") {
          emitCue?.("resource:travel:start");
        }
      })
      .to(el, {
        x: end.x,
        y: end.y,
        scale: config.travelScale,
        rotation: 0,
        duration: config.travelDuration,
        ease: "power2.inOut"
      })
      .to(el, {
        opacity: 0,
        duration: RESOURCE_FLOW_FADE_DURATION,
        ease: "power1.out"
      });
  });

  if (animatedCount === 0) return 0;
  return (
    delayOffset +
    RESOURCE_FLOW_DELAY +
    config.stagger * Math.max(0, animatedCount - 1) +
    config.popDuration +
    config.holdDuration +
    config.travelDuration +
    RESOURCE_FLOW_FADE_DURATION
  );
};

export const getDevCardPlayActorKey = (payload = {}) =>
  payload.effectId ?? `devcard:${payload.cardType}:${payload.playerId}`;

export const getDevCardPlaySourceId = ({ playerId, cardType, perspective }) => {
  if (perspective === "local") return `p${playerId}-devcards`;
  return `p${playerId}-devcards`;
};

export const getDevCardPlayedScale = (perspective) =>
  PLAYED_SCALE_BY_PERSPECTIVE[perspective] ?? PLAYED_SCALE_BY_PERSPECTIVE.opponent;

export const getDevCardPlayParkPosition = ({
  sourceRect,
  perspective,
  parkRect = null
}) => {
  const playedScale = getDevCardPlayedScale(perspective);
  const visualHeight = CARD_HEIGHT * playedScale;
  const horizontalRect = parkRect ?? sourceRect;
  return {
    x:
      horizontalRect.left +
      horizontalRect.width / 2 -
      CARD_WIDTH / 2 +
      (perspective === "local" ? LOCAL_PLAYED_OFFSET.x : 0),
    y:
      perspective === "local"
        ? sourceRect.top - visualHeight * 0.78 + LOCAL_PLAYED_OFFSET.y
        : sourceRect.bottom + visualHeight * 0.36
  };
};

export function createDevCardPlayRunner({
  layerEl,
  getLayerEl,
  getSourceEl,
  getTargetEl,
  getPerspective,
  getMotionPolicy,
  actorStore,
  emitCue,
  onStart,
  onResolveComplete,
  themeId
} = {}) {
  const getLayer = () => (getLayerEl ? getLayerEl() : layerEl);
  const store = actorStore ?? { current: new Map() };

  const cleanupActor = (key) => {
    const actor = store.current?.get?.(key);
    actor?.el?.remove?.();
    store.current?.delete?.(key);
  };

  const completeResolve = (payload) => {
    cleanupActor(getDevCardPlayActorKey(payload));
    onResolveComplete?.(payload);
  };

  return function run(eventOrPayload) {
    const payload = eventOrPayload?.payload ?? eventOrPayload;
    if (!payload || !DEV_CARD_FACE_SVGS[payload.cardType]) return;

    const motionPolicy = getMotionPolicy?.(payload) ?? "full";
    const key = getDevCardPlayActorKey(payload);
    if (payload.phase === "start") {
      onStart?.(payload);
    }
    if (motionPolicy === "disabled" || isDocumentHidden()) {
      if (payload.phase === "resolve") completeResolve(payload);
      return;
    }

    const layer = getLayer();
    if (!layer || typeof document === "undefined") {
      if (payload.phase === "resolve") completeResolve(payload);
      return;
    }

    if (payload.phase === "start") {
      cleanupActor(key);
      const perspective = getPerspective?.(payload) ?? "opponent";
      const sourceId = getDevCardPlaySourceId({
        playerId: payload.playerId,
        cardType: payload.cardType,
        perspective
      });
      const sourceEl = getSourceEl?.(payload, sourceId) ?? document.getElementById(sourceId);
      const sourceRect = sourceEl?.getBoundingClientRect?.();
      if (!sourceRect) return;
      const parkEl =
        perspective === "local"
          ? null
          : document.getElementById(`p${payload.playerId}-opponent-box`);
      const parkRect = parkEl?.getBoundingClientRect?.() ?? null;

      const el = createDevCardElement(payload.cardType);
      const img = el.querySelector("img");
      if (perspective !== "local" && img) {
        img.src = DEV_CARD_BACK_SRC;
      }
      layer.appendChild(el);
      store.current?.set?.(key, { el, payload, perspective });

      const from = getCenterPosition(sourceRect);
      const playedScale = getDevCardPlayedScale(perspective);
      const park = getDevCardPlayParkPosition({
        sourceRect,
        perspective,
        parkRect
      });

      gsap.set(el, {
        x: from.x,
        y: from.y,
        opacity: 0,
        scale: perspective === "local" ? 0.92 : 0.78,
        rotationY: 0
      });

      if (motionPolicy === "reduced") {
        gsap.set(el, { x: park.x, y: park.y, opacity: 1, scale: playedScale });
        return;
      }

      const playCue = `devcard:${payload.cardType}:play`;
      const flipCue = `devcard:${payload.cardType}:flip`;
      emitCue?.(perspective === "local" ? playCue : flipCue);
      gsap
        .timeline()
        .to(el, {
          opacity: 1,
          scale: playedScale * 1.08,
          x: park.x,
          y: park.y,
          duration: START_POP_DURATION,
          ease: "back.out(1.8)"
        })
        .to(el, {
          scale: playedScale,
          duration: START_SETTLE_DURATION,
          ease: "power2.out"
        });
      if (perspective !== "local") {
        gsap
          .timeline({
            delay: START_POP_DURATION + START_SETTLE_DURATION + OPPONENT_REVEAL_PAUSE
          })
          .to(el, {
            rotationY: 90,
            duration: OPPONENT_FLIP_DURATION / 2,
            ease: "power2.in"
          })
          .call(() => {
            if (img) img.src = getDevCardFaceSrc(payload.cardType);
          })
          .set(el, { rotationY: -90 })
          .to(el, {
            rotationY: 0,
            duration: OPPONENT_FLIP_DURATION / 2,
            ease: "back.out(1.4)"
          });
      }
      return;
    }

    if (payload.phase !== "resolve") return;
    const actor = store.current?.get?.(key);
    const el = actor?.el ?? createDevCardElement(payload.cardType);

    if (payload.cardType !== "knight") {
      if (!actor?.el) {
        const fallbackSource = getSourceEl?.(payload, `p${payload.playerId}-devcards`);
        const fallbackRect = fallbackSource?.getBoundingClientRect?.();
        if (!fallbackRect) {
          completeResolve(payload);
          return;
        }
        const from = getCenterPosition(fallbackRect);
        gsap.set(el, { x: from.x, y: from.y, opacity: 1, scale: 1 });
        layer.appendChild(el);
        store.current?.set?.(key, { el, payload, perspective: "opponent" });
      }

      if (payload.cardType === "roadBuilding") {
        emitCue?.(`devcard:${payload.cardType}:resolve`);
      }
      if (motionPolicy === "reduced") {
        completeResolve(payload);
        return;
      }

      const previewDuration = runMonopolySelectionPreview({
        payload,
        actorEl: el,
        layer,
        themeId,
        emitCue
      });
      const flowDuration = runDevCardResourceFlow({
        payload,
        actorEl: el,
        layer,
        getSourceEl,
        themeId,
        emitCue,
        delayOffset: previewDuration
      });
      runSpentCardExit({
        el,
        payload,
        delay: Math.max(previewDuration, flowDuration),
        completeResolve
      });
      return;
    }

    const targetEl =
      getTargetEl?.(payload, `p${payload.playerId}-largest-army`) ??
      document.getElementById(`p${payload.playerId}-largest-army`);
    const targetRect = targetEl?.getBoundingClientRect?.();
    if (!targetRect) {
      completeResolve(payload);
      return;
    }

    if (!actor?.el) {
      const fallbackSource = getSourceEl?.(payload, `p${payload.playerId}-devcards`);
      const fallbackRect = fallbackSource?.getBoundingClientRect?.() ?? targetRect;
      const from = getCenterPosition(fallbackRect);
      gsap.set(el, { x: from.x, y: from.y, opacity: 1, scale: 1 });
      layer.appendChild(el);
      store.current?.set?.(key, { el, payload, perspective: "opponent" });
    }

    const end = getCenterPosition(targetRect, CARD_WIDTH * 0.52, CARD_HEIGHT * 0.52);
    emitCue?.(`devcard:${payload.cardType}:resolve`);

    if (motionPolicy === "reduced") {
      completeResolve(payload);
      return;
    }

    gsap
      .timeline({
        onComplete: () => completeResolve(payload)
      })
      .to(el, {
        x: end.x,
        y: end.y,
        scale: 0.52,
        opacity: 0.95,
        duration: 0.58,
        ease: "power2.inOut"
      })
      .to(el, {
        opacity: 0,
        duration: 0.12,
        ease: "power1.out"
      });
  };
}
