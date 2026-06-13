import { getLongestRoadResult } from "@settlex/game-core";
import { appendGameLog } from "../utils/gameLog.js";
import { getAwardOwners } from "./devCardPresentation.js";

const getPlayerRoadIds = (core, playerId) =>
  Object.entries(core?.roadsByEdgeId ?? {})
    .filter(([, ownerId]) => String(ownerId) === String(playerId))
    .map(([edgeId]) => edgeId);

const getLongestRoadAwardRoadIds = (G, playerId) => {
  if (G?.core && G?.coreTopology) {
    const result = getLongestRoadResult(G.core, G.coreTopology, playerId);
    if (result.edgeIds.length > 0) {
      return result.edgeIds;
    }
  }
  return getPlayerRoadIds(G?.core, playerId);
};

export const logAwardChanges = (G, ctx, previousAwards, options, effects) => {
  if (!previousAwards) return;
  const currentAwards = getAwardOwners(G?.core);
  const changes = [
    {
      type: "award:longestRoad",
      previousOwnerId: previousAwards.longestRoadOwnerId,
      nextOwnerId: currentAwards.longestRoadOwnerId
    },
    {
      type: "award:largestArmy",
      previousOwnerId: previousAwards.largestArmyOwnerId,
      nextOwnerId: currentAwards.largestArmyOwnerId
    }
  ];

  changes.forEach(({ type, previousOwnerId, nextOwnerId }) => {
    if (!nextOwnerId) return;
    if (nextOwnerId === previousOwnerId) return;
    appendGameLog(G, ctx, {
      type,
      actorId: nextOwnerId,
      data: previousOwnerId ? { previousOwnerId } : {},
      forced: options?.forced
    });
    if (type === "award:longestRoad") {
      effects?.awardClaimed?.({
        effectId: `award:longest-road:${nextOwnerId}:turn-${ctx?.turn ?? "unknown"}`,
        awardType: "longestRoad",
        playerId: nextOwnerId,
        previousOwnerId: previousOwnerId ?? null,
        roadIds: getLongestRoadAwardRoadIds(G, nextOwnerId),
        forced: Boolean(options?.forced)
      });
    }
  });
};
