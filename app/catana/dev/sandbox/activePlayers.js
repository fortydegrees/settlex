const buildResignableActivePlayers = (playerIds, stageAssignments) => {
  const entries = Object.entries(stageAssignments ?? {});
  if (entries.length === 0) {
    return null;
  }

  const activePlayers = {};
  for (const playerId of playerIds ?? []) {
    activePlayers[String(playerId)] = null;
  }

  for (const [playerId, stage] of entries) {
    activePlayers[String(playerId)] = stage;
  }

  return activePlayers;
};

export const buildSandboxActivePlayers = (G) => {
  const playerIds = G?.core?.players?.map(String) ?? [];
  const currentPlayerId =
    G?.core?.turn?.currentPlayerId != null
      ? String(G.core.turn.currentPlayerId)
      : null;

  if (!currentPlayerId || playerIds.length === 0) {
    return null;
  }

  if (G?.core?.phase === "placement") {
    const hasRoadTargets = (G?.valids?.edges?.length ?? 0) > 0;
    const pendingRoadNodeId =
      G?.core?.pendingRoadFromNodeIdByPlayer?.[currentPlayerId];
    const stage =
      hasRoadTargets || pendingRoadNodeId != null ? "road" : "settlement";

    return buildResignableActivePlayers(playerIds, {
      [currentPlayerId]: stage
    });
  }

  if (G?.core?.phase !== "normal") {
    return null;
  }

  const turnPhase = G?.core?.turn?.phase;
  if (turnPhase === "robberDiscard") {
    const pendingDiscards = G?.core?.turn?.pendingDiscards ?? [];
    if (pendingDiscards.length > 0) {
      return buildResignableActivePlayers(
        playerIds,
        pendingDiscards.reduce((acc, playerId) => {
          acc[String(playerId)] = "robberDiscard";
          return acc;
        }, {})
      );
    }

    return buildResignableActivePlayers(playerIds, {
      [currentPlayerId]: "robberDiscard"
    });
  }

  if (turnPhase === "robberMove") {
    return buildResignableActivePlayers(playerIds, {
      [currentPlayerId]: "moveRobber"
    });
  }

  return buildResignableActivePlayers(playerIds, {
    [currentPlayerId]: turnPhase === "postRoll" ? "postRoll" : "preRoll"
  });
};

export const serializeActivePlayers = (activePlayers) =>
  JSON.stringify(
    Object.entries(activePlayers ?? {}).sort(([left], [right]) =>
      String(left).localeCompare(String(right))
    )
  );
