import { DEFAULT_STACK_MAX_WIDTH, getCardStackLayout } from "./CardStackLayout";

export const DEV_CARD_DISPLAY_ORDER = [
  "knight",
  "yearOfPlenty",
  "roadBuilding",
  "monopoly"
];

export const getPlayableDevCardGroups = ({
  cards = [],
  playableCountsByType = {},
  cardWidth = 52,
  stackOffset = 16,
  maxStackWidth = DEFAULT_STACK_MAX_WIDTH,
  badgeMinCount = 3,
  order = DEV_CARD_DISPLAY_ORDER
} = {}) => {
  const countsByType = {};
  cards.forEach((card) => {
    if (card === "victoryPoint") return;
    countsByType[card] = (countsByType[card] ?? 0) + 1;
  });

  return order
    .filter((cardType) => (countsByType[cardType] ?? 0) > 0)
    .map((cardType) => {
      const count = countsByType[cardType] ?? 0;
      const playableCount = Math.max(
        0,
        Math.min(count, playableCountsByType[cardType] ?? 0)
      );
      const layout = getCardStackLayout({
        count,
        cardWidth,
        stackOffset,
        maxVisible: count,
        maxStackWidth,
        badgeMinCount
      });
      const cardsForGroup = Array.from({ length: count }).map((_, index) => ({
        type: cardType,
        isPlayable: index >= count - playableCount
      }));

      return {
        type: cardType,
        count,
        playableCount,
        layout,
        cards: cardsForGroup
      };
    });
};
