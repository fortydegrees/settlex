import { getVictoryPoints } from "@settlex/game-core";
import { resolveEffectivePlayerColors } from "./playerColorsInGame";
import { mergePlayerMetadata, sanitizeDisplayName } from "./playerIdentity";
import { buildPlayerViewMap } from "./playerView";

export function buildPlayerMetadataMaps(mergedMatchData = []) {
  const nameMap = {};
  const emojiMap = {};
  const colorMap = {};

  if (Array.isArray(mergedMatchData)) {
    mergedMatchData.forEach((player) => {
      if (player?.id == null) return;
      const playerId = String(player.id);
      const cleanName = sanitizeDisplayName(player.name);
      nameMap[playerId] = cleanName || `Player ${playerId}`;
      if (player.data?.emoji) emojiMap[playerId] = player.data.emoji;
      if (player.data?.color) colorMap[playerId] = player.data.color;
    });
  }

  return { nameMap, emojiMap, colorMap };
}

export function buildLogPlayerMap({
  seatPlayerIds = [],
  nameMap = {},
  emojiMap = {},
  colorMap = {},
  effectiveColorByPlayerId = {}
} = {}) {
  const ids = new Set([
    ...seatPlayerIds.map(String),
    ...Object.keys(nameMap),
    ...Object.keys(emojiMap),
    ...Object.keys(colorMap),
    ...Object.keys(effectiveColorByPlayerId)
  ]);
  const map = {};

  ids.forEach((id) => {
    map[id] = {
      name: nameMap[id] ?? `Player ${id}`,
      emoji: emojiMap[id] ?? null,
      color: effectiveColorByPlayerId[id] ?? "red"
    };
  });

  return map;
}

export function buildScoreboard({
  core,
  playerViewMap = {},
  nameMap = {},
  winnerId = null
} = {}) {
  if (!core) return [];

  return Object.values(playerViewMap)
    .map((view) => ({
      id: view.id,
      name: nameMap[view.id] ?? view.name ?? `Player ${view.id}`,
      vp: getVictoryPoints(core, view.id),
      color: view.color,
      isWinner: String(view.id) === String(winnerId)
    }))
    .sort((a, b) => b.vp - a.vp);
}

export function getGameOverReasonCopy(reason) {
  if (reason === "victoryPoints" || !reason) return "Victory Points";
  if (reason === "Resignation") return "Resignation";
  if (reason === "Disconnect Forfeit") return "Disconnect Forfeit";
  if (reason === "AFK Forfeit") return "AFK Forfeit";
  return String(reason);
}

export function buildPostgameSummary({
  isGameOver,
  winnerName,
  gameOverReasonText,
  winnerVP
} = {}) {
  if (!isGameOver) return [];

  return [
    { label: "Winner", value: winnerName },
    { label: "Reason", value: gameOverReasonText },
    { label: "Final VP", value: winnerVP != null ? `${winnerVP}` : "—" }
  ];
}

export function buildGameScreenDisplayModel({
  core,
  playerID,
  gameOverState,
  isGameOver,
  matchData = [],
  matchMetadata = []
} = {}) {
  const mergedMatchData = mergePlayerMetadata(
    Array.isArray(matchData) ? matchData : [],
    Array.isArray(matchMetadata) ? matchMetadata : []
  );
  const { nameMap, emojiMap, colorMap } =
    buildPlayerMetadataMaps(mergedMatchData);
  const seatPlayerIds = Array.isArray(core?.players)
    ? core.players.map(String)
    : [];
  const effectiveColorByPlayerId = resolveEffectivePlayerColors({
    playerIds: seatPlayerIds,
    preferredColorByPlayerId: colorMap
  });
  const playerViewMap = buildPlayerViewMap(core, effectiveColorByPlayerId);
  const rawPlayer = playerViewMap[playerID];
  const player = rawPlayer
    ? {
        ...rawPlayer,
        name: nameMap[rawPlayer.id],
        emoji: emojiMap[rawPlayer.id]
      }
    : null;
  const winnerId = gameOverState?.winnerId ?? gameOverState?.winner ?? null;
  const winnerName =
    winnerId != null ? nameMap[winnerId] ?? `Player ${winnerId}` : "Unknown";
  const isWinner =
    winnerId != null && playerID != null && String(winnerId) === String(playerID);
  const winnerVP =
    winnerId != null && core ? getVictoryPoints(core, String(winnerId)) : null;
  const scoreboard = buildScoreboard({
    core,
    playerViewMap,
    nameMap,
    winnerId
  });
  const logPlayerMap = buildLogPlayerMap({
    seatPlayerIds,
    nameMap,
    emojiMap,
    colorMap,
    effectiveColorByPlayerId
  });
  const gameOverReasonText = getGameOverReasonCopy(gameOverState?.reason);
  const postgameSummary = buildPostgameSummary({
    isGameOver,
    winnerName,
    gameOverReasonText,
    winnerVP
  });

  return {
    mergedMatchData,
    nameMap,
    emojiMap,
    colorMap,
    seatPlayerIds,
    effectiveColorByPlayerId,
    playerViewMap,
    player,
    winnerId,
    winnerName,
    isWinner,
    winnerVP,
    scoreboard,
    logPlayerMap,
    gameOverReasonText,
    postgameSummary
  };
}
