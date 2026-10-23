import { readBrowserStorage, writeBrowserStorage, removeBrowserStorage } from "../../../lib/client/browserStorage.js";
import {
  PLAYER_COLOR_PICKER_OPTIONS,
  normalizePlayerColorId,
} from "../theme/playerColors";
import { buildGeneratedGuestUsername } from "../../../lib/shared/guestUsername";

export const STORAGE_KEY_NAME = "settlehex:lobby:playerName";
export const STORAGE_KEY_EMOJI = "settlehex:lobby:playerEmoji";
export const STORAGE_KEY_COLOR = "settlehex:lobby:playerColor";

export const EMOJI_OPTIONS = [
  "😀", "😃", "😄", "😁",
  "😆", "😎", "🤩", "🥳",
  "😏", "🤠", "🤓", "😈",
  "🥸", "😇", "🤑", "🤪",
];

const getStorageValue = (storage, key) => {
  try {
    return readBrowserStorage(storage, key) || "";
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
      writeBrowserStorage(storage, STORAGE_KEY_NAME, name);
    } else {
      removeBrowserStorage(storage, STORAGE_KEY_NAME);
    }

    if (emoji) {
      writeBrowserStorage(storage, STORAGE_KEY_EMOJI, emoji);
    } else {
      removeBrowserStorage(storage, STORAGE_KEY_EMOJI);
    }

    if (color) {
      writeBrowserStorage(storage, STORAGE_KEY_COLOR, normalizePlayerColorId(color));
    } else {
      removeBrowserStorage(storage, STORAGE_KEY_COLOR);
    }
  } catch (error) {
    /* ignore storage write failures */
  }
};

const pickRandom = (values) =>
  values[Math.floor(Math.random() * values.length)];

const pickRandomEmoji = () => pickRandom(EMOJI_OPTIONS);
const pickRandomColor = () =>
  pickRandom(PLAYER_COLOR_PICKER_OPTIONS.map((option) => option.id));

export const buildSuggestedGuestIdentity = ({
  buildUsername = buildGeneratedGuestUsername,
  pickEmoji = pickRandomEmoji,
  pickColor = pickRandomColor,
} = {}) => ({
  name: buildUsername(),
  emoji: pickEmoji(),
  color: normalizePlayerColorId(pickColor()),
});
