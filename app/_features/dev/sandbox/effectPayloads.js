const SANDBOX_DEV_CARD_TYPES = new Set([
  "roadBuilding",
  "yearOfPlenty",
  "monopoly"
]);

const resolveActorId = ({ playerId, fallbackPlayerId, viewerPlayerId } = {}) =>
  String(playerId ?? fallbackPlayerId ?? viewerPlayerId ?? "0");

const resolvePhase = (phase) => (phase === "resolve" ? "resolve" : "start");

export function buildSandboxDevCardPlayPayload({
  playerId,
  fallbackPlayerId,
  viewerPlayerId,
  cardType,
  phase,
  playerViewMap = {},
  largestArmyOwnerId = null
} = {}) {
  const actorId = resolveActorId({ playerId, fallbackPlayerId, viewerPlayerId });
  const resolvedCardType = SANDBOX_DEV_CARD_TYPES.has(cardType)
    ? cardType
    : "knight";
  const resolvedPhase = resolvePhase(phase);
  const actor = playerViewMap[actorId];
  const previousKnightsPlayed = actor?.knightsPlayed ?? 0;
  const basePayload = {
    effectId: `dev-sandbox:${resolvedCardType}:${actorId}`,
    playerId: actorId,
    cardType: resolvedCardType,
    phase: resolvedPhase,
    startedFromStage: "postRoll"
  };

  if (resolvedCardType === "roadBuilding") {
    return {
      ...basePayload,
      pendingRoads: resolvedPhase === "resolve" ? 0 : 2,
      previousRoadsRemaining: actor?.roadsRemaining ?? null,
      nextRoadsRemaining: actor?.roadsRemaining ?? null
    };
  }

  if (resolvedCardType === "yearOfPlenty") {
    return {
      ...basePayload,
      resources: ["Wood", "Brick"]
    };
  }

  if (resolvedCardType === "monopoly") {
    return {
      ...basePayload,
      resource: "Wood",
      transfers: [
        {
          fromPlayerId: String(viewerPlayerId ?? "0"),
          toPlayerId: actorId,
          resource: "Wood",
          count: 2
        }
      ],
      totalTransferred: 2
    };
  }

  return {
    ...basePayload,
    previousKnightsPlayed,
    nextKnightsPlayed: previousKnightsPlayed + 1,
    previousLargestArmyOwnerId: largestArmyOwnerId ?? null,
    nextLargestArmyOwnerId: largestArmyOwnerId ?? actorId
  };
}

export function buildSandboxRobberMovePayload({
  detail = {},
  fallbackActorId,
  viewerPlayerId
} = {}) {
  return {
    effectId: `dev-sandbox:robber-move:${detail.fromTileId}:${detail.toTileId}`,
    actorId: detail.actorId ?? fallbackActorId ?? viewerPlayerId ?? "0",
    fromTileId: detail.fromTileId,
    toTileId: detail.toTileId,
    debugReplay: true,
    forced: true,
    hideSourceTile: true,
    hideDestinationTile: false
  };
}

export function buildSandboxAwardClaimPayload({
  detail = {},
  effectiveColorByPlayerId = {}
} = {}) {
  return {
    effectId: `dev-sandbox:award:${detail.awardType}:${detail.playerId}`,
    awardType: detail.awardType ?? "longestRoad",
    playerId: detail.playerId,
    previousOwnerId: detail.previousOwnerId ?? null,
    playerColorId: effectiveColorByPlayerId[detail.playerId],
    roadIds: detail.roadIds ?? [],
    debugReplay: true
  };
}
