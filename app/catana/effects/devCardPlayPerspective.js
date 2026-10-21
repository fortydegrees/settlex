export const DEV_CARD_PLAY_PERSPECTIVES = Object.freeze({
  LOCAL: "local",
  OPPONENT: "opponent",
  SPECTATOR: "spectator"
});

export const getDevCardPlayPerspective = ({ viewerPlayerId, actorPlayerId } = {}) => {
  if (viewerPlayerId == null || viewerPlayerId === "") {
    return DEV_CARD_PLAY_PERSPECTIVES.SPECTATOR;
  }
  return String(viewerPlayerId) === String(actorPlayerId)
    ? DEV_CARD_PLAY_PERSPECTIVES.LOCAL
    : DEV_CARD_PLAY_PERSPECTIVES.OPPONENT;
};

export const getDevCardPlayMotionPolicy = ({
  disabled = false,
  reducedMotion = false
} = {}) => {
  if (disabled) return "disabled";
  if (reducedMotion) return "reduced";
  return "full";
};
