const MAX_USERNAME_LENGTH = 28;
const CONTROL_CHARACTER_RE = /[\u0000-\u001f\u007f]/;
const BOT_PREFIX_RE = /^\s*\[bot\]/i;

const createInputError = (message) =>
  Object.assign(new Error(message), {
    code: "INVALID_ACCOUNT_IDENTITY",
    status: 400,
  });

export { MAX_USERNAME_LENGTH };

export const normalizeUsername = (value) => {
  if (typeof value !== "string") {
    throw createInputError("Username is required");
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw createInputError("Username is required");
  }

  if (normalized.length > MAX_USERNAME_LENGTH) {
    throw createInputError(`Username must be ${MAX_USERNAME_LENGTH} characters or fewer`);
  }

  if (CONTROL_CHARACTER_RE.test(normalized)) {
    throw createInputError("Username contains unsupported characters");
  }

  if (BOT_PREFIX_RE.test(normalized)) {
    throw createInputError("Username cannot start with [bot]");
  }

  return normalized;
};

export const normalizeAvatarValue = (value, fieldName) => {
  if (typeof value !== "string" || !value.trim()) {
    throw createInputError(`${fieldName} is required`);
  }

  return value.trim();
};
