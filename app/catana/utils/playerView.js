import { SEAT_FALLBACK_COLOR_IDS } from "../theme/playerColors.js";

export const UI_PLAYER_COLORS = [...SEAT_FALLBACK_COLOR_IDS];

export function buildPlayerViewMap(core, colorByPlayerId = {}) {
  const map = {};
  if (!core?.players) return map;
  core.players.forEach((id, index) => {
    const state = core.playerStateById?.[id];
    const fallbackColor =
      UI_PLAYER_COLORS[index % UI_PLAYER_COLORS.length] ?? UI_PLAYER_COLORS[0];
    map[id] = {
      id,
      color: colorByPlayerId[id] ?? fallbackColor,
      resources: state?.resources ?? [],
      roadsRemaining: state?.roadsRemaining ?? 0,
      settlementsRemaining: state?.settlementsRemaining ?? 0,
      citiesRemaining: state?.citiesRemaining ?? 0,
      devCards: state?.devCards ?? [],
      knightsPlayed: state?.knightsPlayed ?? 0
    };
  });
  return map;
}
