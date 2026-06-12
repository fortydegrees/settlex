const DEFAULT_GAME_PORT = 8000;
const DEFAULT_LOBBY_API_PORT = 8080;

const parsePort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export function resolveServerPorts(env = process.env) {
  return {
    gamePort: parsePort(
      env.SETTLEX_GAME_SERVER_PORT ?? env.PORT,
      DEFAULT_GAME_PORT
    ),
    lobbyApiPort: parsePort(
      env.SETTLEX_LOBBY_API_PORT,
      DEFAULT_LOBBY_API_PORT
    )
  };
}
