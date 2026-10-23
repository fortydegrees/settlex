import environment from "../lib/config/environment.cjs";
const { readEnvironment } = environment;
const DEFAULT_GAME_PORT = 8000;
const DEFAULT_LOBBY_API_PORT = 8080;

const parsePort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export function resolveServerPorts(env = process.env) {
  return {
    gamePort: parsePort(
      readEnvironment(env, "SETTLEHEX_GAME_SERVER_PORT") ?? env.PORT,
      DEFAULT_GAME_PORT
    ),
    lobbyApiPort: parsePort(
      readEnvironment(env, "SETTLEHEX_LOBBY_API_PORT"),
      DEFAULT_LOBBY_API_PORT
    )
  };
}
