const getConfiguredOrigin = () =>
  process.env.NEXT_PUBLIC_GAME_SERVER_ORIGIN?.trim() || "";

const getWindowLocation = () => {
  if (typeof window === "undefined") return null;
  return window.location;
};

export const getLobbyServerOrigin = () => {
  const configuredOrigin = getConfiguredOrigin();
  if (configuredOrigin) return configuredOrigin;

  const location = getWindowLocation();
  if (!location) return "http://localhost:8080";

  if (process.env.NODE_ENV === "production") {
    return location.origin;
  }

  return `${location.protocol}//${location.hostname}:8080`;
};

export const getGameServerOrigin = () => {
  const configuredOrigin = getConfiguredOrigin();
  if (configuredOrigin) return configuredOrigin;

  const location = getWindowLocation();
  if (!location) return "http://localhost:8000";

  if (process.env.NODE_ENV === "production") {
    return location.origin;
  }

  return `${location.protocol}//${location.hostname}:8000`;
};
