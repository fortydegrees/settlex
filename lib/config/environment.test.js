import { describe, expect, it } from "vitest";
import { resolveServerPorts } from "../../server/runtimeConfig.js";
import { isBotEnabled } from "../server/matches/botMatch.js";

describe("SettleHex environment migration", () => {
  it("uses canonical server ports before legacy ports", () => {
    expect(resolveServerPorts({ SETTLEHEX_GAME_SERVER_PORT: "9010", SETTLEX_GAME_SERVER_PORT: "9020", SETTLEHEX_LOBBY_API_PORT: "9011", SETTLEX_LOBBY_API_PORT: "9021" })).toEqual({gamePort:9010,lobbyApiPort:9011});
  });
  it("keeps existing installations using the legacy environment", () => {
    expect(resolveServerPorts({ SETTLEX_GAME_SERVER_PORT: "9020", SETTLEX_LOBBY_API_PORT: "9021" })).toEqual({gamePort:9020,lobbyApiPort:9021});
    expect(isBotEnabled(undefined, {SETTLEX_SETTLEGRAPH_V2_ENABLED:"1"})).toBe(true);
  });
  it.each(["", "0", false])("does not re-enable a bot when canonical value is %s", value => {
    expect(isBotEnabled(undefined, {SETTLEHEX_SETTLEGRAPH_V2_ENABLED:value, SETTLEX_SETTLEGRAPH_V2_ENABLED:"1"})).toBe(false);
  });
  it("enables the canonical bot setting", () => {
    expect(isBotEnabled(undefined, {SETTLEHEX_SETTLEGRAPH_V2_ENABLED:"1"})).toBe(true);
  });
  it("does not restore an old port over an explicit empty canonical value", () => {
    expect(resolveServerPorts({SETTLEHEX_GAME_SERVER_PORT:"",SETTLEX_GAME_SERVER_PORT:"9020"}).gamePort).toBe(8000);
  });
});
