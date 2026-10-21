const CANCELLABLE_ACTIONS = new Set(["placeRoad", "placeSettlement", "placeCity"]);

export const shouldCancelBuildAction = ({
  playerAction,
  phase,
  targetIsActionCircle
}) => {
  if (!CANCELLABLE_ACTIONS.has(playerAction)) return false;
  if (phase === "placement") return false;
  if (targetIsActionCircle) return false;
  return true;
};
