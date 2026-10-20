export const getAwardOwners = (core) => ({
  longestRoadOwnerId: core?.awards?.longestRoadOwnerId ?? null,
  largestArmyOwnerId: core?.awards?.largestArmyOwnerId ?? null
});

export const buildDevCardPlayEffectId = ({ playerId, cardType, turn }) =>
  `devcard:${cardType}:${playerId}:turn-${turn ?? "unknown"}`;

export const buildKnightPlayPayload = ({
  G,
  ctx,
  playerId,
  phase,
  startedFromStage,
  previousKnightsPlayed,
  previousLargestArmyOwnerId
}) => {
  const currentPlayerState = G?.core?.playerStateById?.[playerId];
  const nextKnightsPlayed = currentPlayerState?.knightsPlayed ?? previousKnightsPlayed;
  const currentAwards = getAwardOwners(G?.core);
  return {
    effectId: buildDevCardPlayEffectId({
      playerId,
      cardType: "knight",
      turn: ctx?.turn
    }),
    playerId,
    cardType: "knight",
    phase,
    startedFromStage: startedFromStage ?? null,
    previousKnightsPlayed,
    nextKnightsPlayed,
    previousLargestArmyOwnerId: previousLargestArmyOwnerId ?? null,
    nextLargestArmyOwnerId: currentAwards.largestArmyOwnerId ?? null
  };
};

export const buildRoadBuildingPlayPayload = ({
  ctx,
  playerId,
  phase,
  startedFromStage,
  pendingRoads,
  previousRoadsRemaining,
  nextRoadsRemaining,
  effectId
}) => ({
  effectId:
    effectId ??
    buildDevCardPlayEffectId({
      playerId,
      cardType: "roadBuilding",
      turn: ctx?.turn
    }),
  playerId,
  cardType: "roadBuilding",
  phase,
  startedFromStage: startedFromStage ?? null,
  pendingRoads,
  previousRoadsRemaining,
  nextRoadsRemaining
});

export const buildChoiceDevCardPlayPayload = ({
  ctx,
  playerId,
  cardType,
  phase,
  startedFromStage,
  effectId,
  resources,
  resource,
  transfers,
  totalTransferred
}) => ({
  effectId:
    effectId ??
    buildDevCardPlayEffectId({
      playerId,
      cardType,
      turn: ctx?.turn
    }),
  playerId,
  cardType,
  phase,
  startedFromStage: startedFromStage ?? null,
  ...(resources ? { resources } : {}),
  ...(resource ? { resource } : {}),
  ...(transfers ? { transfers } : {}),
  ...(totalTransferred != null ? { totalTransferred } : {})
});

export const buildMonopolyTransfers = (core, playerId, resource) =>
  Object.entries(core?.playerStateById ?? {})
    .filter(([otherId]) => otherId !== playerId)
    .map(([otherId, other]) => ({
      fromPlayerId: otherId,
      toPlayerId: playerId,
      resource,
      count: (other?.resources ?? []).filter((entry) => entry === resource).length
    }))
    .filter((entry) => entry.count > 0);

export const hasMaskedOpponentResources = (core, playerId) =>
  Object.entries(core?.playerStateById ?? {}).some(
    ([otherId, other]) =>
      otherId !== playerId &&
      (other?.resources ?? []).some((resource) => resource === "hidden")
  );

export const storePendingKnightPlayAnimation = (G, payload) => {
  G.pendingDevCardPlayAnimation = {
    ...payload,
    phase: "pending"
  };
};

export const emitPendingDevCardPlayResolved = (context) => {
  const { G, ctx, effects } = context;
  const pending = G?.pendingDevCardPlayAnimation;
  if (!pending || pending.cardType !== "knight") return;
  const payload = buildKnightPlayPayload({
    G,
    ctx,
    playerId: pending.playerId,
    phase: "resolve",
    startedFromStage: pending.startedFromStage,
    previousKnightsPlayed: pending.previousKnightsPlayed,
    previousLargestArmyOwnerId: pending.previousLargestArmyOwnerId
  });
  effects?.devCardPlayResolved?.(payload);
  G.pendingDevCardPlayAnimation = null;
};
