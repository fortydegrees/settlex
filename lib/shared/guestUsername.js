export const USERNAME_SOURCE_CUSTOM = "custom";
export const USERNAME_SOURCE_GENERATED = "generated";

const ADJECTIVES = Object.freeze([
  "Amber",
  "Bold",
  "Bright",
  "Clever",
  "Cozy",
  "Golden",
  "Lucky",
  "Merry",
  "Nimble",
  "Quiet",
  "Royal",
  "Sharp",
  "Sunny",
  "Swift",
  "Wily",
]);

const NOUNS = Object.freeze([
  "Brick",
  "Cactus",
  "Harbor",
  "Hex",
  "Island",
  "Knight",
  "Ore",
  "Port",
  "Road",
  "Sheep",
  "Trader",
  "Wheat",
]);

const SUFFIX_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const randomIntInRange = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = (values, randomInt) => values[randomInt(0, values.length - 1)];

export const normalizeUsernameSource = (source) =>
  source === USERNAME_SOURCE_GENERATED
    ? USERNAME_SOURCE_GENERATED
    : USERNAME_SOURCE_CUSTOM;

export const isGeneratedUsernameSource = (source) =>
  normalizeUsernameSource(source) === USERNAME_SOURCE_GENERATED;

export const buildGeneratedGuestUsername = ({
  randomInt = randomIntInRange,
  suffixLength = 2,
} = {}) => {
  let suffix = "";

  for (let index = 0; index < suffixLength; index += 1) {
    suffix += pick(SUFFIX_ALPHABET, randomInt);
  }

  return `${pick(ADJECTIVES, randomInt)}${pick(NOUNS, randomInt)}${suffix}`;
};
