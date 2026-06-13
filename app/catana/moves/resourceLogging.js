import { appendGameLog } from "../utils/gameLog.js";

export const logResourceDistributions = (G, ctx, distributions, options) => {
  if (!Array.isArray(distributions) || distributions.length === 0) return;
  const byPlayer = new Map();
  for (const dist of distributions) {
    if (!dist?.playerId || !dist?.resource) continue;
    const existing = byPlayer.get(dist.playerId) ?? {};
    existing[dist.resource] = (existing[dist.resource] ?? 0) + 1;
    byPlayer.set(dist.playerId, existing);
  }
  const playerIds = Array.from(byPlayer.keys()).sort();
  playerIds.forEach((playerId) => {
    appendGameLog(G, ctx, {
      type: "resource:gain",
      actorId: playerId,
      data: { resources: byPlayer.get(playerId) },
      forced: options?.forced
    });
  });
};

export const logResourceShortages = (G, ctx, shortages, options) => {
  if (!Array.isArray(shortages) || shortages.length === 0) return;
  shortages.forEach((shortage) => {
    if (!shortage?.resource) return;
    appendGameLog(G, ctx, {
      type: "resource:shortage",
      data: shortage,
      forced: options?.forced
    });
  });
};
