import { gsap } from "gsap";
import { isDocumentHidden } from "../utils/visibility";
import {
  getClassicSvgPath,
  getThemedSvgPath,
  handleThemeImageError
} from "../theme/themes";

const RESOURCE_CARD_BACK_FILE = "cards/resource/card_rescardback.svg";
const DEV_CARD_BACK_SRC = "/svgs/cards/development/card_devcardback.svg";
const RESOURCE_CARD_FILES_BY_RESOURCE = Object.freeze({
  Wood: "cards/resource/card_wood.svg",
  Brick: "cards/resource/card_brick.svg",
  Sheep: "cards/resource/card_sheep.svg",
  Wheat: "cards/resource/card_wheat.svg",
  Ore: "cards/resource/card_ore.svg"
});

const RESOURCE_CARD_WIDTH = 44;
const RESOURCE_CARD_HEIGHT = 62;
const DEV_CARD_WIDTH = 52;
const DEV_CARD_HEIGHT = 72;
const TRANSFER_STAGGER = 0.045;
const TRANSFER_DURATION = 0.52;
const FADE_DURATION = 0.08;
const HIDDEN_CARD = "hidden";

const getCardSize = (kind) =>
  kind === "dev"
    ? { width: DEV_CARD_WIDTH, height: DEV_CARD_HEIGHT }
    : { width: RESOURCE_CARD_WIDTH, height: RESOURCE_CARD_HEIGHT };

const getElementCenter = (el, size) => {
  const rect = el?.getBoundingClientRect?.();
  if (!rect) return null;
  return {
    x: rect.left + rect.width / 2 - size.width / 2,
    y: rect.top + rect.height / 2 - size.height / 2
  };
};

const getBankPoint = (size) => {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return {
    x: window.innerWidth / 2 - size.width / 2,
    y: window.innerHeight * 0.38 - size.height / 2
  };
};

const getResourceAnchorId = ({ playerId, resource, hidden }) => {
  if (playerId == null) return null;
  if (!hidden && resource && resource !== HIDDEN_CARD) {
    return `p${playerId}-${resource}`;
  }
  return `p${playerId}-resources`;
};

const getPlayerAnchorEl = ({ transfer, endpoint, getEndpointEl }) => {
  const playerId = endpoint === "from" ? transfer.fromPlayerId : transfer.toPlayerId;
  if (playerId == null) return null;

  const explicitId =
    endpoint === "from" ? transfer.fromElementId : transfer.toElementId;
  if (explicitId) {
    const explicitEl =
      getEndpointEl?.(transfer, explicitId) ?? document.getElementById(explicitId);
    if (explicitEl) return explicitEl;
  }

  if (transfer.kind === "dev") {
    const id = `p${playerId}-devcards`;
    return getEndpointEl?.(transfer, id) ?? document.getElementById(id);
  }

  const specificId = getResourceAnchorId({
    playerId,
    resource: transfer.resource,
    hidden: transfer.hidden
  });
  const fallbackId = `p${playerId}-resources`;
  return (
    getEndpointEl?.(transfer, specificId) ??
    document.getElementById(specificId) ??
    getEndpointEl?.(transfer, fallbackId) ??
    document.getElementById(fallbackId)
  );
};

const getEndpointPoint = ({ transfer, endpoint, size, getEndpointEl }) => {
  const kind = endpoint === "from" ? transfer.fromKind : transfer.toKind;
  if (kind === "bank" || kind === "discard") return getBankPoint(size);
  const el = getPlayerAnchorEl({ transfer, endpoint, getEndpointEl });
  return getElementCenter(el, size) ?? getBankPoint(size);
};

const createCardElement = ({ transfer, themeId }) => {
  const size = getCardSize(transfer.kind);
  const el = document.createElement("div");
  el.className =
    transfer.kind === "dev"
      ? "pointer-events-none drop-shadow-xl"
      : "pointer-events-none drop-shadow-lg";
  el.style.position = "absolute";
  el.style.pointerEvents = "none";
  el.style.width = `${size.width}px`;
  el.style.height = `${size.height}px`;

  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;
  img.style.display = "block";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";

  if (transfer.kind === "dev") {
    img.src = DEV_CARD_BACK_SRC;
  } else {
    const fileName =
      transfer.hidden || !transfer.resource || transfer.resource === HIDDEN_CARD
        ? RESOURCE_CARD_BACK_FILE
        : RESOURCE_CARD_FILES_BY_RESOURCE[transfer.resource] ?? RESOURCE_CARD_BACK_FILE;
    img.src = getThemedSvgPath(themeId, fileName);
    img.onerror = (event) =>
      handleThemeImageError(event, getClassicSvgPath(RESOURCE_CARD_BACK_FILE));
  }

  el.appendChild(img);
  return el;
};

const countResources = (resources = []) =>
  resources.reduce((acc, resource) => {
    acc[resource] = (acc[resource] ?? 0) + 1;
    return acc;
  }, {});

const findCountDeltaResource = ({ before = [], after = [], direction }) => {
  const beforeCounts = countResources(before.filter((entry) => entry !== HIDDEN_CARD));
  const afterCounts = countResources(after.filter((entry) => entry !== HIDDEN_CARD));
  const resources = new Set([
    ...Object.keys(beforeCounts),
    ...Object.keys(afterCounts)
  ]);
  for (const resource of resources) {
    const delta = (afterCounts[resource] ?? 0) - (beforeCounts[resource] ?? 0);
    if (direction === "added" && delta > 0) return resource;
    if (direction === "removed" && delta < 0) return resource;
  }
  return null;
};

export const getRobberStealVisibleResource = ({
  payload,
  viewerPlayerId,
  previousResourcesByPlayerId,
  currentPlayerViewMap
} = {}) => {
  if (viewerPlayerId == null || !payload) return null;
  const viewerId = String(viewerPlayerId);
  const thiefId = String(payload.thiefId ?? "");
  const victimId = String(payload.victimId ?? "");
  if (viewerId !== thiefId && viewerId !== victimId) return null;

  const before = previousResourcesByPlayerId?.get?.(viewerId) ?? [];
  const after = currentPlayerViewMap?.[viewerId]?.resources ?? [];
  return findCountDeltaResource({
    before,
    after,
    direction: viewerId === thiefId ? "added" : "removed"
  });
};

export function createCardTransferRunner({
  getLayerEl,
  getEndpointEl,
  resolveTransfers,
  emitCue,
  themeId
} = {}) {
  return function run(eventOrPayload) {
    const payload = eventOrPayload?.payload ?? eventOrPayload;
    if (!payload || isDocumentHidden() || typeof document === "undefined") return;

    const layer = getLayerEl?.();
    if (!layer) return;

    const transfers = resolveTransfers?.(payload) ?? payload.transfers ?? [];
    if (!Array.isArray(transfers) || transfers.length === 0) return;

    transfers.forEach((transfer, index) => {
      const size = getCardSize(transfer.kind);
      const from = getEndpointPoint({
        transfer,
        endpoint: "from",
        size,
        getEndpointEl
      });
      const to = getEndpointPoint({
        transfer,
        endpoint: "to",
        size,
        getEndpointEl
      });
      const el = createCardElement({ transfer, themeId });
      layer.appendChild(el);

      gsap.set(el, {
        x: from.x,
        y: from.y,
        opacity: 0,
        scale: transfer.startScale ?? 0.82,
        rotation: index % 2 === 0 ? -2 : 2
      });

      gsap
        .timeline({
          delay: index * TRANSFER_STAGGER,
          onComplete: () => el.remove()
        })
        .to(el, {
          opacity: 1,
          scale: 1.04,
          duration: 0.12,
          ease: "back.out(1.8)"
        })
        .call(() => emitCue?.(transfer.cueName ?? "resource:travel:start"))
        .to(el, {
          x: to.x,
          y: to.y,
          scale: transfer.endScale ?? 0.88,
          rotation: 0,
          duration: transfer.duration ?? TRANSFER_DURATION,
          ease: "power2.inOut"
        })
        .to(el, {
          opacity: 0,
          duration: FADE_DURATION,
          ease: "power1.out"
        });
    });
  };
}
