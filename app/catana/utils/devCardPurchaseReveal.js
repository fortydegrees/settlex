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
      travelToCenter: 0.22,
      holdAfterTravel: 0.1,
      backReveal: 0.12,
      holdAfterBackReveal: 0.08,
      flip: 0.18,
      holdOnFace: 0.18,
      travelToHand: 0.34,
    };
  }

  return {
    travelToCenter: 0.42,
    holdAfterTravel: 0.16,
    backReveal: 0.2,
    holdAfterBackReveal: 0.16,
    flip: 0.32,
    holdOnFace: 0.46,
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
