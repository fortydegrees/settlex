const ATTENTION_ICON_HREF = "/match-alert-bell.svg";
const ATTENTION_REASONS = new Set(["match-found", "your-turn"]);
const ATTENTION_PRIORITY = ["match-found", "your-turn"];
const ATTENTION_TITLES = Object.freeze({
  "match-found": "🔔 Match found · Settlehex",
  "your-turn": "🔔 Your turn · Settlehex"
});

const activeReasons = new Set();
let metadataSnapshot = null;
let listeningDocument = null;

const getDocument = () =>
  typeof document === "undefined" ? null : document;

const removeLink = (link) => {
  if (!link) return;
  if (typeof link.remove === "function") {
    link.remove();
    return;
  }
  link.parentNode?.removeChild?.(link);
};

const captureMetadata = (documentRef) => {
  const iconLink = documentRef.head?.querySelector?.('link[rel~="icon"]') ?? null;
  const iconHref = iconLink?.getAttribute?.("href") ?? null;

  metadataSnapshot = {
    title: documentRef.title,
    iconLink,
    iconHref,
    iconHadHref: iconHref !== null,
    createdIconLink: null
  };
};

const restoreMetadata = (documentRef) => {
  if (!metadataSnapshot) return;

  documentRef.title = metadataSnapshot.title;
  if (metadataSnapshot.createdIconLink) {
    removeLink(metadataSnapshot.createdIconLink);
  } else if (metadataSnapshot.iconLink) {
    if (metadataSnapshot.iconHadHref) {
      metadataSnapshot.iconLink.setAttribute("href", metadataSnapshot.iconHref);
    } else {
      metadataSnapshot.iconLink.removeAttribute("href");
    }
  }

  metadataSnapshot = null;
};

const applyAttention = (documentRef, reason) => {
  if (!metadataSnapshot) captureMetadata(documentRef);

  documentRef.title = ATTENTION_TITLES[reason];
  let iconLink = metadataSnapshot.iconLink ?? metadataSnapshot.createdIconLink;
  if (!iconLink) {
    iconLink = documentRef.createElement("link");
    iconLink.setAttribute("rel", "icon");
    documentRef.head?.appendChild?.(iconLink);
    metadataSnapshot.createdIconLink = iconLink;
  }
  iconLink.setAttribute("href", ATTENTION_ICON_HREF);
};

const getHighestPriorityReason = () =>
  ATTENTION_PRIORITY.find((reason) => activeReasons.has(reason)) ?? null;

const syncVisibility = () => {
  const documentRef = getDocument();
  if (!documentRef) return;

  if (!documentRef.hidden) {
    restoreMetadata(documentRef);
    activeReasons.delete("match-found");
    return;
  }

  const reason = getHighestPriorityReason();
  if (!reason) {
    restoreMetadata(documentRef);
    return;
  }

  applyAttention(documentRef, reason);
};

const ensureVisibilityListener = () => {
  const documentRef = getDocument();
  if (!documentRef || listeningDocument === documentRef) return;

  documentRef.addEventListener("visibilitychange", syncVisibility);
  listeningDocument = documentRef;
};

export const tabAttention = Object.freeze({
  request(reason) {
    if (!ATTENTION_REASONS.has(reason)) return;
    ensureVisibilityListener();
    if (activeReasons.has(reason)) return;
    activeReasons.add(reason);
    syncVisibility();
  },

  release(reason) {
    if (!ATTENTION_REASONS.has(reason)) return;
    if (!activeReasons.delete(reason)) return;
    syncVisibility();
  },

  syncVisibility() {
    ensureVisibilityListener();
    syncVisibility();
  }
});
