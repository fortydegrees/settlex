export function buildDevCardCounts(cards = []) {
  return cards.reduce((counts, cardType) => {
    counts[cardType] = (counts[cardType] ?? 0) + 1;
    return counts;
  }, {});
}

export function findBoughtDevCardType({ beforeCards = [], afterCards = [] } = {}) {
  const beforeCounts = buildDevCardCounts(beforeCards);
  const afterCounts = buildDevCardCounts(afterCards);

  for (const [cardType, count] of Object.entries(afterCounts)) {
    if (count > (beforeCounts[cardType] ?? 0)) {
      return cardType;
    }
  }

  return null;
}

export function getDevCardRevealDurations(reducedMotion = false) {
  if (reducedMotion) {
    return {
      releasePop: 0.08,
      travelToCenter: 0.24,
      holdAfterTravel: 0.12,
      backReveal: 0.14,
      holdAfterBackReveal: 0.08,
      flip: 0.2,
      holdOnFace: 0.22,
      travelToHand: 0.4,
    };
  }

  return {
    releasePop: 0.14,
    travelToCenter: 0.52,
    holdAfterTravel: 0.22,
    backReveal: 0.24,
    holdAfterBackReveal: 0.2,
    flip: 0.38,
    holdOnFace: 0.56,
    travelToHand: 0.72,
  };
}

export function getHiddenDevCardType({
  pendingReveal = null,
  activeReveal = null,
  playerId = null,
  playerDevCards = [],
} = {}) {
  if (playerId == null) return null;

  if (activeReveal?.cardType && String(activeReveal.playerId) === String(playerId)) {
    return activeReveal.cardType;
  }

  if (pendingReveal && String(pendingReveal.playerId) === String(playerId)) {
    return findBoughtDevCardType({
      beforeCards: pendingReveal.beforeCards,
      afterCards: playerDevCards,
    });
  }

  return null;
}

export function removeDevCardFromHand(cards = [], cardType = null) {
  if (!cardType) return [...cards];

  const removeIndex = cards.findIndex((candidate) => candidate === cardType);
  if (removeIndex === -1) return [...cards];

  return cards.filter((_, index) => index !== removeIndex);
}
