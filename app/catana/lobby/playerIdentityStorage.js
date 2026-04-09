import {
  PLAYER_COLOR_PICKER_OPTIONS,
  normalizePlayerColorId,
} from "../theme/playerColors";

export const STORAGE_KEY_NAME = "catana:lobby:playerName";
export const STORAGE_KEY_EMOJI = "catana:lobby:playerEmoji";
export const STORAGE_KEY_COLOR = "catana:lobby:playerColor";

export const EMOJI_OPTIONS = [
  "😀", "😃", "😄", "😁",
  "😆", "😎", "🤩", "🥳",
  "😏", "🤠", "🤓", "😈",
  "🥸", "😇", "🤑", "🤪",
];

const getStorageValue = (storage, key) => {
  try {
    return storage?.getItem(key) || "";
  } catch (error) {
    return "";
  }
};

export const readStoredPlayerIdentity = (storage) => {
  const name = getStorageValue(storage, STORAGE_KEY_NAME).trim();
  const emoji = getStorageValue(storage, STORAGE_KEY_EMOJI);
  const color = getStorageValue(storage, STORAGE_KEY_COLOR);

  return {
    name,
    emoji,
    color: color ? normalizePlayerColorId(color) : "",
  };
};

export const writeStoredPlayerIdentity = (
  storage,
  { name = "", emoji = "", color = "" } = {}
) => {
  try {
    if (name) {
      storage?.setItem(STORAGE_KEY_NAME, name);
    } else {
      storage?.removeItem(STORAGE_KEY_NAME);
    }

    if (emoji) {
      storage?.setItem(STORAGE_KEY_EMOJI, emoji);
    } else {
      storage?.removeItem(STORAGE_KEY_EMOJI);
    }

    if (color) {
      storage?.setItem(STORAGE_KEY_COLOR, normalizePlayerColorId(color));
    } else {
      storage?.removeItem(STORAGE_KEY_COLOR);
    }
  } catch (error) {
    /* ignore storage write failures */
  }
};

const randomIntInRange = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandom = (values) =>
  values[Math.floor(Math.random() * values.length)];

const pickRandomEmoji = () => pickRandom(EMOJI_OPTIONS);
const pickRandomColor = () =>
  pickRandom(PLAYER_COLOR_PICKER_OPTIONS.map((option) => option.id));

export const buildSuggestedGuestIdentity = ({
  randomInt = randomIntInRange,
  pickEmoji = pickRandomEmoji,
  pickColor = pickRandomColor,
} = {}) => ({
  name: `Guest ${randomInt(1000, 9999)}`,
  emoji: pickEmoji(),
  color: normalizePlayerColorId(pickColor()),
});
