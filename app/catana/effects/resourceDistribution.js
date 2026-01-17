import { gsap } from "gsap";
import { RESOURCE_ICON_SVGS } from "../game/types";
import { tilePixelVector } from "../utils/coordinates";
import { isDocumentHidden } from "../utils/visibility";

const CARD_CLASS = "rounded border-2 border-white p-2 drop-shadow-lg";

const RESOURCE_COLORS = {
  Wood: "#3f952d",
  Brick: "#d77230",
  Sheep: "#69c80f",
  Wheat: "#f2c535",
  Ore: "#a9aeae"
};

const RESOURCE_IMAGE_CLASS = {
  Wood: "mt-2",
  Brick: "mt-4",
  Sheep: "mt-3",
  Wheat: "mt-2",
  Ore: "mt-4"
};

function createCardElement(resource) {
  const el = document.createElement("div");
  el.className = CARD_CLASS;
  el.style.position = "absolute";
  el.style.backgroundColor = RESOURCE_COLORS[resource] ?? "#FFFFFF";

  const img = document.createElement("img");
  img.src = RESOURCE_ICON_SVGS[resource];
  img.alt = "";
  img.className = RESOURCE_IMAGE_CLASS[resource] ?? "";
  el.appendChild(img);
  return el;
}

export function scheduleResourceCues(timeline, emitCue) {
  if (!timeline || !emitCue) return;
  timeline.call(() => emitCue("resource:travel:start"), null, "travel");
}

export function createResourceDistributionRunner({
  layerEl,
  getLayerEl,
  getLayout,
  getBoardRect,
  emitCue
} = {}) {
  return function run(payload) {
    if (typeof document === "undefined") return;
    if (isDocumentHidden()) return;

    const resolvedLayer = getLayerEl ? getLayerEl() : layerEl;
    if (!resolvedLayer || !getLayout || !getBoardRect) return;

    const cards = Array.isArray(payload) ? payload : payload?.cards ?? [];
    if (!cards.length) return;

    const layout = getLayout();
    if (!layout?.size || !layout?.center) return;
    const { size, center } = layout;
    const boardRect = getBoardRect();
    if (!boardRect) return;

    cards.forEach((card, index) => {
      const [centerX, centerY] = center;
      const [tileX, tileY] = tilePixelVector(card.coordinate, size, centerX, centerY);

      const cardWidth = size * 0.5;
      const cardHeight = size * 0.7;
      const startX = boardRect.left + tileX - cardWidth / 2;
      const startY = boardRect.top + tileY - size;

      const specificId = `p${card.playerID}-${card.resource}`;
      const genericId = `p${card.playerID}-resources`;
      const targetEl = document.getElementById(specificId) || document.getElementById(genericId);
      if (!targetEl) return;

      const targetRect = targetEl.getBoundingClientRect();
      const endX = targetRect.left;
      const endY = targetRect.top - 15;

      const el = createCardElement(card.resource);
      el.style.width = `${cardWidth}px`;
      el.style.height = `${cardHeight}px`;
      resolvedLayer.appendChild(el);

      gsap.set(el, { x: startX, y: startY, opacity: 0, scale: 0.7 });

      const tl = gsap.timeline({
        onComplete: () => {
          el.remove();
        }
      });

      tl.to(el, { opacity: 1, scale: 1, duration: 0.15 })
        .addLabel("travel")
        .to(el, { x: endX, y: endY, duration: 0.6, ease: "power2.out" }, "travel");

      scheduleResourceCues(tl, emitCue);
      tl.delay(1 + index * 0.03);
    });
  };
}
