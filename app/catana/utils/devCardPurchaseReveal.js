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
