// Plugin data is filtered separately from G by boardgame.io's transport layer.
// Keep timeline identity/timing intact while limiting purchased card faces to the buyer.
export const maskEffectsPlayerView = ({ data, playerID }) => {
  if (!Array.isArray(data?.queue)) return data;

  let changed = false;
  const queue = data.queue.map((event) => {
    if (event?.type !== "buyDevCardReveal" || event.payload?.cardType == null) {
      return event;
    }
    if (
      playerID != null &&
      event.payload.playerId != null &&
      String(playerID) === String(event.payload.playerId)
    ) {
      return event;
    }

    changed = true;
    const payload = { ...event.payload };
    delete payload.cardType;
    return { ...event, payload };
  });

  return changed ? { ...data, queue } : data;
};
