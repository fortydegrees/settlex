const MAX_USERNAME_LENGTH = 28;
const USERNAME_RE = /^[A-Za-z0-9_]+$/;

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

  if (!USERNAME_RE.test(normalized)) {
    throw createInputError(
      "Username can only use English letters, numbers, and underscores"
    );
  }

  return normalized;
};

export const normalizeAvatarValue = (value, fieldName) => {
  if (typeof value !== "string" || !value.trim()) {
    throw createInputError(`${fieldName} is required`);
  }

  return value.trim();
};
