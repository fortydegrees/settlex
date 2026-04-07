export function getDevCardRevealDurations(reducedMotion = false) {
  if (reducedMotion) {
    return {
      releasePop: 0.1,
      travelToCenter: 0.28,
      holdAfterTravel: 0.14,
      backReveal: 0.16,
      holdAfterBackReveal: 0.08,
      flip: 0.24,
      holdOnFace: 0.2,
      travelToHand: 0.34,
    };
  }

  return {
    releasePop: 0.16,
    travelToCenter: 0.58,
    holdAfterTravel: 0.08,
    backReveal: 0.28,
    holdAfterBackReveal: 0.1,
    flip: 0.42,
    holdOnFace: 0.5,
    travelToHand: 0.6,
  };
}

export function getVisibleDevCardsDuringReveal({
  pendingReveal = null,
  activeReveal = null,
  playerId = null,
  playerDevCards = [],
} = {}) {
  if (playerId == null) return [...playerDevCards];

  if (activeReveal?.beforeCards && String(activeReveal.playerId) === String(playerId)) {
    return [...activeReveal.beforeCards];
  }

  if (pendingReveal && String(pendingReveal.playerId) === String(playerId)) {
    return [...(pendingReveal.beforeCards ?? [])];
  }

  return [...playerDevCards];
}
