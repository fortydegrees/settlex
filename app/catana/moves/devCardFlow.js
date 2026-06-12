import { ResourceType } from "../types.js";

export const DEV_CARD_CHOICE_STAGE = "devCardChoice";

export const STANDARD_RESOURCE_TYPES = [
  ResourceType.WOOD,
  ResourceType.BRICK,
  ResourceType.SHEEP,
  ResourceType.WHEAT,
  ResourceType.ORE
];

const CHOICE_DEV_CARD_TYPES = new Set(["yearOfPlenty", "monopoly"]);

export const isChoiceDevCardType = (cardType) =>
  CHOICE_DEV_CARD_TYPES.has(cardType);

export const isDevCardChoiceStage = (ctx, playerID) =>
  ctx.activePlayers?.[playerID] === DEV_CARD_CHOICE_STAGE;

export const getDevCardReturnStage = (devPlay) =>
  devPlay?.startedFromStage === "preRoll" ? "preRoll" : "postRoll";

export const buildAutoYearOfPlentyPayload = (core, random) => {
  if (!core?.ruleset?.bank?.finite) {
    const shuffled = random?.Shuffle
      ? random.Shuffle(STANDARD_RESOURCE_TYPES)
      : STANDARD_RESOURCE_TYPES;
    return [shuffled[0], shuffled[1] ?? shuffled[0]];
  }

  const available = [];
  for (const resource of STANDARD_RESOURCE_TYPES) {
    const count = (core.bank?.resources ?? []).filter(
      (entry) => entry === resource
    ).length;
    for (let index = 0; index < Math.min(2, count); index += 1) {
      available.push(resource);
    }
  }
  const shuffled = random?.Shuffle ? random.Shuffle(available) : available;
  return shuffled.slice(0, 2);
};
