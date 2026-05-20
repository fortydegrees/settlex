import { DEFAULT_STACK_MAX_WIDTH, getCardStackLayout } from "./CardStackLayout";

export const DEV_CARD_SVGS = {
  knight: "/svgs/cards/development/knight.svg",
  victoryPoint: "/svgs/cards/development/victory_point.svg",
  roadBuilding: "/svgs/cards/development/roadbuilding.svg",
  yearOfPlenty: "/svgs/cards/development/year_of_plenty.svg",
  monopoly: "/svgs/cards/development/monopoly.svg",
};

export const DEV_CARD_TEXT = {
  knight: {
    name: "Knight",
    description: "Move the robber and build toward Largest Army."
  },
  victoryPoint: {
    name: "Victory Point",
    description: "A secret point that counts toward your final score."
  },
  roadBuilding: {
    name: "Road Building",
    description: "Place up to two roads without spending resources."
  },
  yearOfPlenty: {
    name: "Year of Plenty",
    description: "Take any two resources from the bank."
  },
  monopoly: {
    name: "Monopoly",
    description: "Choose a resource and claim every copy from other players."
  },
};

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

export const getDevCardHandGroups = ({
  cards = [],
  playableCountsByType = {},
  cardWidth = 52,
  stackOffset = 16,
  maxStackWidth = DEFAULT_STACK_MAX_WIDTH,
  badgeMinCount = 3,
  order = DEV_CARD_DISPLAY_ORDER
} = {}) => {
  const victoryPointCount = cards.filter((card) => card === "victoryPoint").length;
  const playableGroups = getPlayableDevCardGroups({
    cards,
    playableCountsByType,
    cardWidth,
    stackOffset,
    maxStackWidth,
    badgeMinCount,
    order
  });
  const itemsByType = new Map();

  if (victoryPointCount > 0) {
    itemsByType.set("victoryPoint", {
      type: "victoryPoint",
      count: victoryPointCount,
      playableCount: 0,
      isPlayable: false,
      layout: getCardStackLayout({
        count: victoryPointCount,
        cardWidth,
        stackOffset,
        maxVisible: victoryPointCount,
        maxStackWidth,
        badgeMinCount
      }),
      cards: Array.from({ length: victoryPointCount }).map(() => ({
        type: "victoryPoint",
        isPlayable: false
      }))
    });
  }

  playableGroups.forEach((group) => {
    itemsByType.set(group.type, {
      ...group,
      isPlayable: group.playableCount > 0
    });
  });

  return ["victoryPoint", ...order]
    .map((type) => itemsByType.get(type))
    .filter(Boolean);
};

export const getMobileDevCardButtonState = ({
  cards = [],
  playableCountsByType = {},
} = {}) => {
  const groups = getDevCardHandGroups({ cards, playableCountsByType });
  const playableCount = groups.reduce(
    (total, group) => total + (group.playableCount ?? 0),
    0
  );
  const firstPlayableGroup = groups.find((group) => group.isPlayable);
  const firstVisibleGroup = firstPlayableGroup ?? groups[0] ?? null;

  return {
    groups,
    totalCount: cards.length,
    playableCount,
    hasPlayableCards: playableCount > 0,
    previewType: firstVisibleGroup?.type ?? null,
  };
};
