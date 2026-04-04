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
    holdAfterTravel: 0.26,
    backReveal: 0.28,
    holdAfterBackReveal: 0.22,
    flip: 0.42,
    holdOnFace: 0.5,
    travelToHand: 0.6,
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
