export const setCurrentPlayerStage = (context, stage) => {
  const { events } = context;
  if (typeof events?.setActivePlayers === "function") {
    events.setActivePlayers({ currentPlayer: stage, others: null });
    return;
  }
  events?.setStage?.(stage);
};
