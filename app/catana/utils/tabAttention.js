const ATTENTION_ICON_HREF = "/match-alert-bell.svg";
const ATTENTION_REASONS = new Set([
  "match-found",
  "player-looking",
  "your-turn"
]);
const ATTENTION_PRIORITY = ["match-found", "player-looking", "your-turn"];
const TRANSIENT_ATTENTION_REASONS = ["match-found", "player-looking"];
const ATTENTION_TITLES = Object.freeze({
  "match-found": "🔔 Match found · Settlehex",
  "player-looking": "🔔 Player looking · Settlehex",
  "your-turn": "🔔 Your turn · Settlehex"
});

const activeReasons = new Set();
let metadataSnapshot = null;
let listeningDocument = null;
let pageTitleOwner = null;

const getDocument = () =>
  typeof document === "undefined" ? null : document;

const isAttentionTitle = (title) => Object.values(ATTENTION_TITLES).includes(title);

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

  if (isAttentionTitle(documentRef.title)) {
    documentRef.title = metadataSnapshot.title;
  }
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
  if (!metadataSnapshot) {
    captureMetadata(documentRef);
  } else if (!isAttentionTitle(documentRef.title)) {
    metadataSnapshot.title = documentRef.title;
  }

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
    TRANSIENT_ATTENTION_REASONS.forEach((reason) => activeReasons.delete(reason));
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
  setPageTitle(title) {
    const documentRef = getDocument();
    if (!documentRef) return undefined;
    const previousTitle = metadataSnapshot?.title ?? documentRef.title;
    const owner = {};
    pageTitleOwner = owner;

    const applyTitle = (nextTitle) => {
      // Alerts temporarily own the displayed title; update their restore target.
      if (metadataSnapshot) metadataSnapshot.title = nextTitle;
      const reason = documentRef.hidden ? getHighestPriorityReason() : null;
      documentRef.title = reason ? ATTENTION_TITLES[reason] : nextTitle;
    };
    applyTitle(title);

    return () => {
      if (pageTitleOwner !== owner) return;
      pageTitleOwner = null;
      // A route metadata update may already have taken ownership.
      if (metadataSnapshot && !isAttentionTitle(documentRef.title)) return;
      if ((metadataSnapshot?.title ?? documentRef.title) !== title) return;
      applyTitle(previousTitle);
    };
  },

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
