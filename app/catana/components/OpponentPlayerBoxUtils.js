export const getOpponentResourceBadgeTone = ({ resourceCount, discardLimit }) => {
  const safeResources = resourceCount ?? 0;
  const safeLimit = discardLimit ?? 7;
  return safeResources > safeLimit ? "danger" : "default";
};
