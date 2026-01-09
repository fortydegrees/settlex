const UI_PLAYER_COLORS = ["red", "blue", "green", "orange"];

export function buildPlayerViewMap(core) {
  const map = {};
  if (!core?.players) return map;
  core.players.forEach((id, index) => {
    const state = core.playerStateById?.[id];
    map[id] = {
      id,
      color: UI_PLAYER_COLORS[index % UI_PLAYER_COLORS.length],
      resources: state?.resources ?? [],
      roadsRemaining: state?.roadsRemaining ?? 0,
      settlementsRemaining: state?.settlementsRemaining ?? 0,
      citiesRemaining: state?.citiesRemaining ?? 0
    };
  });
  return map;
}
