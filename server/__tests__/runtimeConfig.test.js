import { describe, expect, it } from "vitest";
import { resolveServerPorts } from "../runtimeConfig.js";

describe("server runtime config", () => {
  it("keeps default game and lobby ports unchanged", () => {
    expect(resolveServerPorts({})).toEqual({
      gamePort: 8000,
      lobbyApiPort: 8080
    });
  });

  it("allows live smoke tests to run on explicit alternate ports", () => {
    expect(
      resolveServerPorts({
        SETTLEX_GAME_SERVER_PORT: "18000",
        SETTLEX_LOBBY_API_PORT: "18080"
      })
    ).toEqual({
      gamePort: 18000,
      lobbyApiPort: 18080
    });
  });
});
