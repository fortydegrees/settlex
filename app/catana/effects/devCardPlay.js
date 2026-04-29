import { gsap } from "gsap";
import { isDocumentHidden } from "../utils/visibility";

const KNIGHT_CARD_SRC = "/svgs/cards/development/knight.svg";
const DEV_CARD_BACK_SRC = "/svgs/cards/development/card_devcardback.svg";
const CARD_WIDTH = 52;
const CARD_HEIGHT = 72;
const CARD_CLASS = "pointer-events-none drop-shadow-xl";
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

const getCenterPosition = (rect, width = CARD_WIDTH, height = CARD_HEIGHT) => ({
  x: rect.left + rect.width / 2 - width / 2,
  y: rect.top + rect.height / 2 - height / 2
});

const createKnightCardElement = () => {
  const el = document.createElement("div");
  el.className = CARD_CLASS;
  el.style.position = "absolute";
  el.style.pointerEvents = "none";
  el.style.width = `${CARD_WIDTH}px`;
  el.style.height = `${CARD_HEIGHT}px`;
  el.style.transformStyle = "preserve-3d";
  el.style.filter = FLOAT_SHADOW;

  const img = document.createElement("img");
  img.src = KNIGHT_CARD_SRC;
  img.alt = "";
  img.draggable = false;
  img.style.display = "block";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  el.appendChild(img);
  return el;
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
  onResolveComplete
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
    if (!payload || payload.cardType !== "knight") return;

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

      const el = createKnightCardElement();
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

      emitCue?.(perspective === "local" ? "devcard:knight:play" : "devcard:knight:flip");
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
            if (img) img.src = KNIGHT_CARD_SRC;
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
    const targetEl =
      getTargetEl?.(payload, `p${payload.playerId}-largest-army`) ??
      document.getElementById(`p${payload.playerId}-largest-army`);
    const targetRect = targetEl?.getBoundingClientRect?.();
    if (!targetRect) {
      completeResolve(payload);
      return;
    }

    const actor = store.current?.get?.(key);
    const el = actor?.el ?? createKnightCardElement();
    if (!actor?.el) {
      const fallbackSource = getSourceEl?.(payload, `p${payload.playerId}-devcards`);
      const fallbackRect = fallbackSource?.getBoundingClientRect?.() ?? targetRect;
      const from = getCenterPosition(fallbackRect);
      gsap.set(el, { x: from.x, y: from.y, opacity: 1, scale: 1 });
      layer.appendChild(el);
      store.current?.set?.(key, { el, payload, perspective: "opponent" });
    }

    const end = getCenterPosition(targetRect, CARD_WIDTH * 0.52, CARD_HEIGHT * 0.52);
    emitCue?.("devcard:knight:resolve");

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
